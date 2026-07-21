import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { readData, writeData } from "../data.js";

export interface ConfData {
  permissions: Record<string, string>; // commandName -> roleId
}

export const defaultConfData: ConfData = { permissions: {} };

export const ALL_COMMANDS = [
  "pedir-id",
  "ver-id",
  "definir-id-inicial",
  "whitelist",
  "whitelist-conf",
  "ticket",
  "ticket-configurar",
  "embed",
];

const COMMAND_LABELS: Record<string, string> = {
  "pedir-id": "📋 /pedir-id",
  "ver-id": "🪪 /ver-id",
  "definir-id-inicial": "🔢 /definir-id-inicial",
  "whitelist": "📝 /whitelist",
  "whitelist-conf": "⚙️ /whitelist-conf",
  "ticket": "🎫 /ticket",
  "ticket-configurar": "🔧 /ticket-configurar",
  "embed": "🎨 /embed",
};

export const confCommands = [
  new SlashCommandBuilder()
    .setName("conf")
    .setDescription("Configura os cargos que podem usar cada comando")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((c) => c.toJSON());

// ── /conf ────────────────────────────────────────────────────────────────────

export async function handleConfCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await sendConfPanel(interaction);
}

export async function sendConfPanel(
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction
): Promise<void> {
  const data = readData<ConfData>("conf", defaultConfData);
  const guild = interaction.guild;

  const fields = ALL_COMMANDS.map((cmd) => {
    const roleId = data.permissions[cmd];
    let roleDisplay = "🟢 Todos";

    if (roleId && guild) {
      const role = guild.roles.cache.get(roleId);
      roleDisplay = role ? `<@&${roleId}>` : `❓ ID: ${roleId}`;
    }

    return {
      name: COMMAND_LABELS[cmd] ?? `/${cmd}`,
      value: `Cargo: ${roleDisplay}`,
      inline: true,
    };
  });

  const embed = new EmbedBuilder()
    .setColor("#9B59B6")
    .setTitle("⚙️ Configuração de Permissões")
    .setDescription(
      "Aqui você pode definir qual **cargo** tem permissão para usar cada comando.\n" +
      "Se nenhum cargo estiver configurado, **todos** podem usar o comando.\n\n" +
      "Selecione um comando abaixo para configurar:"
    )
    .addFields(fields)
    .setTimestamp();

  const select = new StringSelectMenuBuilder()
    .setCustomId("conf_select_command")
    .setPlaceholder("Selecione um comando para configurar...")
    .addOptions(
      ALL_COMMANDS.map((cmd) => ({
        label: (COMMAND_LABELS[cmd] ?? `/${cmd}`).replace(/^[^\s]+\s/, ""),
        value: cmd,
        description: `Configurar cargo para /${cmd}`,
        emoji: { name: COMMAND_LABELS[cmd]?.match(/^(\S+)/)?.[1] ?? "⚙️" },
      }))
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  if ("replied" in interaction && (interaction.replied || interaction.deferred)) {
    await (interaction as StringSelectMenuInteraction).editReply({
      embeds: [embed],
      components: [row],
    });
  } else {
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
}

// ── Select: escolher comando ─────────────────────────────────────────────────

export async function handleConfSelectCommand(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  const cmd = interaction.values[0];
  const data = readData<ConfData>("conf", defaultConfData);
  const currentRoleId = data.permissions[cmd] ?? "";

  const modal = new ModalBuilder()
    .setCustomId(`conf_modal_${cmd}`)
    .setTitle(`Configurar: /${cmd}`);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("role_id")
        .setLabel("ID do Cargo (deixe vazio para permitir todos)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(currentRoleId)
        .setPlaceholder("Ex: 123456789012345678")
        .setMaxLength(20)
    )
  );

  await interaction.showModal(modal);
}

// ── Modal: salvar cargo ──────────────────────────────────────────────────────

export async function handleConfModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const cmd = interaction.customId.replace("conf_modal_", "");
  const roleId = interaction.fields.getTextInputValue("role_id").trim();
  const data = readData<ConfData>("conf", defaultConfData);
  const guild = interaction.guild;

  // Validate role ID if provided
  if (roleId) {
    const role = guild?.roles.cache.get(roleId);
    if (!role) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#E74C3C")
            .setTitle("❌ Cargo não encontrado")
            .setDescription(
              `O ID \`${roleId}\` não corresponde a nenhum cargo neste servidor.\n\nPara obter o ID de um cargo:\n1. Ative o **Modo Desenvolvedor** em Configurações\n2. Clique com botão direito no cargo → **Copiar ID**`
            )
            .setTimestamp(),
        ],
        ephemeral: true,
      });
      return;
    }

    data.permissions[cmd] = roleId;
    writeData("conf", data);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2ECC71")
          .setTitle("✅ Permissão Configurada!")
          .addFields(
            { name: "Comando", value: `**/${cmd}**`, inline: true },
            { name: "Cargo", value: `<@&${roleId}> (${role.name})`, inline: true }
          )
          .setDescription("Apenas membros com esse cargo poderão usar o comando.")
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } else {
    // Remove restriction
    delete data.permissions[cmd];
    writeData("conf", data);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2ECC71")
          .setTitle("✅ Restrição Removida!")
          .addFields({ name: "Comando", value: `**/${cmd}**`, inline: true })
          .setDescription("Agora **todos** podem usar esse comando.")
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }
}

// ── Permission checker ────────────────────────────────────────────────────────

export function hasCommandPermission(
  interaction: { member: unknown; guild: unknown },
  commandName: string
): boolean {
  const data = readData<ConfData>("conf", defaultConfData);
  const requiredRoleId = data.permissions[commandName];

  // No restriction configured → everyone can use
  if (!requiredRoleId) return true;

  const member = interaction.member as { roles?: { cache?: Map<string, unknown> } } | null;
  if (!member?.roles?.cache) return false;

  return member.roles.cache.has(requiredRoleId);
}
