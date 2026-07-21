import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  TextChannel,
  GuildMember,
} from "discord.js";
import {
  readData,
  writeData,
  defaultWhitelistConfig,
  type WhitelistConfig,
} from "../data.js";

export const whitelistCommands = [
  new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Envia o painel de whitelist no canal atual"),

  new SlashCommandBuilder()
    .setName("whitelist-conf")
    .setDescription("Configura o sistema de whitelist")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((c) => c.toJSON());

// ── /whitelist ───────────────────────────────────────────────────────────────

export async function handleWhitelistCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (interaction.commandName === "whitelist") {
    const cfg = readData<WhitelistConfig>("whitelist-config", defaultWhitelistConfig);

    const embed = new EmbedBuilder()
      .setColor(cfg.cor as `#${string}`)
      .setTitle(cfg.nome)
      .setDescription(
        `📋 **Perguntas da Whitelist:**\n\n${cfg.perguntas
          .slice(0, 5)
          .map((q, i) => `**${i + 1}.** ${q}`)
          .join("\n")}\n\nClique no botão abaixo para enviar sua solicitação.`
      )
      .setTimestamp();

    if (cfg.thumbnail) embed.setThumbnail(cfg.thumbnail);
    if (cfg.url) embed.setURL(cfg.url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("wl_aplicar")
        .setLabel("📝 Quero fazer Whitelist")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }

  if (interaction.commandName === "whitelist-conf") {
    await sendWhitelistConfPanel(interaction);
  }
}

async function sendWhitelistConfPanel(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor("#9B59B6")
    .setTitle("⚙️ Configurações da Whitelist")
    .setDescription("Selecione o que deseja configurar:")
    .addFields(
      { name: "📝 Nome", value: "Título do embed da whitelist", inline: true },
      { name: "🔗 URL", value: "Link do título", inline: true },
      { name: "🖼️ Thumbnail", value: "URL da imagem", inline: true },
      { name: "❓ Perguntas", value: "Perguntas (até 5)", inline: true },
      { name: "🎨 Cor", value: "Cor do embed (#hex)", inline: true },
      { name: "🎖️ Cargo", value: "ID do cargo aprovado", inline: true },
      { name: "📢 Canal de Aprovação", value: "ID do canal de staff", inline: true }
    );

  const select = new StringSelectMenuBuilder()
    .setCustomId("wl_conf_select")
    .setPlaceholder("Selecione uma configuração...")
    .addOptions([
      { label: "📝 Nome", value: "nome", description: "Alterar o título da whitelist" },
      { label: "🔗 URL", value: "url", description: "Alterar o link do título" },
      { label: "🖼️ Thumbnail", value: "thumbnail", description: "Alterar a imagem" },
      { label: "❓ Perguntas", value: "perguntas", description: "Alterar as perguntas" },
      { label: "🎨 Cor", value: "cor", description: "Alterar a cor (#hex)" },
      { label: "🎖️ Cargo", value: "cargo", description: "ID do cargo a dar na aprovação" },
      { label: "📢 Canal de Aprovação", value: "canalAprovacao", description: "ID do canal de staff" },
    ]);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ── Button: Aplicar para whitelist ───────────────────────────────────────────

export async function handleWhitelistButton(
  interaction: ButtonInteraction
): Promise<void> {
  const cfg = readData<WhitelistConfig>("whitelist-config", defaultWhitelistConfig);
  const perguntas = cfg.perguntas.slice(0, 5);

  const modal = new ModalBuilder()
    .setCustomId("wl_modal")
    .setTitle(cfg.nome || "Whitelist");

  const inputs = perguntas.map((pergunta, i) =>
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(`wl_p${i}`)
        .setLabel(pergunta.slice(0, 45))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
    )
  );

  modal.addComponents(...inputs);
  await interaction.showModal(modal);
}

// ── Modal: Resposta da whitelist ─────────────────────────────────────────────

export async function handleWhitelistModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const cfg = readData<WhitelistConfig>("whitelist-config", defaultWhitelistConfig);
  const perguntas = cfg.perguntas.slice(0, 5);

  const respostas = perguntas
    .map((p, i) => {
      const resp = interaction.fields.getTextInputValue(`wl_p${i}`);
      return `**${i + 1}. ${p}**\n${resp}`;
    })
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setColor(cfg.cor as `#${string}`)
    .setTitle(`📋 Nova Solicitação — ${cfg.nome}`)
    .setDescription(respostas)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "👤 Usuário", value: `${interaction.user} (${interaction.user.id})`, inline: true }
    )
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`wl_aprovar_${interaction.user.id}`)
      .setLabel("✅ Aprovar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`wl_negar_${interaction.user.id}`)
      .setLabel("❌ Negar")
      .setStyle(ButtonStyle.Danger)
  );

  // Send to approval channel if configured
  if (cfg.canalAprovacao && interaction.guild) {
    const canal = interaction.guild.channels.cache.get(cfg.canalAprovacao) as TextChannel | undefined;
    if (canal) {
      await canal.send({ embeds: [embed], components: [row] });
      const confirmEmbed = new EmbedBuilder()
        .setColor("#2ECC71")
        .setTitle("✅ Solicitação Enviada")
        .setDescription("Sua solicitação de whitelist foi enviada para análise. Aguarde a resposta da equipe.")
        .setTimestamp();
      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
      return;
    }
  }

  await interaction.reply({ embeds: [embed], components: [row] });
}

// ── Button: Aprovar / Negar ───────────────────────────────────────────────────

export async function handleWhitelistDecision(
  interaction: ButtonInteraction
): Promise<void> {
  const cfg = readData<WhitelistConfig>("whitelist-config", defaultWhitelistConfig);
  const isAprovar = interaction.customId.startsWith("wl_aprovar_");
  const targetId = interaction.customId.replace("wl_aprovar_", "").replace("wl_negar_", "");

  const original = interaction.message.embeds[0];
  const updatedEmbed = EmbedBuilder.from(original)
    .setColor(isAprovar ? "#2ECC71" : "#E74C3C")
    .addFields({
      name: isAprovar ? "✅ Aprovado por" : "❌ Negado por",
      value: `${interaction.user}`,
      inline: true,
    });

  await interaction.update({ embeds: [updatedEmbed], components: [] });

  if (!interaction.guild) return;

  const member = interaction.guild.members.cache.get(targetId) as GuildMember | undefined;
  if (!member) return;

  if (isAprovar) {
    if (cfg.cargo) {
      try {
        await member.roles.add(cfg.cargo);
      } catch {
        // role not found or no permission
      }
    }
    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#2ECC71")
            .setTitle("✅ Whitelist Aprovada!")
            .setDescription(`Sua solicitação de whitelist em **${interaction.guild.name}** foi aprovada! Bem-vindo(a)!`)
            .setTimestamp(),
        ],
      });
    } catch {
      // DMs closed
    }
  } else {
    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#E74C3C")
            .setTitle("❌ Whitelist Negada")
            .setDescription(`Sua solicitação de whitelist em **${interaction.guild.name}** foi negada. Tente novamente mais tarde.`)
            .setTimestamp(),
        ],
      });
    } catch {
      // DMs closed
    }
  }
}

// ── Select: Whitelist conf ────────────────────────────────────────────────────

export async function handleWhitelistConfSelect(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  const value = interaction.values[0];
  const cfg = readData<WhitelistConfig>("whitelist-config", defaultWhitelistConfig);

  if (value === "perguntas") {
    const modal = new ModalBuilder()
      .setCustomId("wl_conf_perguntas_modal")
      .setTitle("Configurar Perguntas da Whitelist");

    for (let i = 0; i < 5; i++) {
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(`pergunta_${i}`)
            .setLabel(`Pergunta ${i + 1} (deixe vazio para remover)`)
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(cfg.perguntas[i] ?? "")
            .setMaxLength(100)
        )
      );
    }

    await interaction.showModal(modal);
    return;
  }

  const labels: Record<string, string> = {
    nome: "Novo Nome da Whitelist",
    url: "Nova URL (link do título)",
    thumbnail: "Nova URL da Thumbnail",
    cor: "Nova Cor (#hex)",
    cargo: "ID do Cargo (aprovação)",
    canalAprovacao: "ID do Canal de Aprovação",
  };

  const currentValues: Record<string, string> = {
    nome: cfg.nome,
    url: cfg.url,
    thumbnail: cfg.thumbnail,
    cor: cfg.cor,
    cargo: cfg.cargo,
    canalAprovacao: cfg.canalAprovacao,
  };

  const modal = new ModalBuilder()
    .setCustomId(`wl_conf_modal_${value}`)
    .setTitle(`Configurar: ${labels[value] ?? value}`);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("valor")
        .setLabel(labels[value] ?? value)
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(currentValues[value] ?? "")
        .setMaxLength(200)
    )
  );

  await interaction.showModal(modal);
}

// ── Modal: Whitelist conf save ────────────────────────────────────────────────

export async function handleWhitelistConfModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const cfg = readData<WhitelistConfig>("whitelist-config", defaultWhitelistConfig);

  if (interaction.customId === "wl_conf_perguntas_modal") {
    const novasPerguntas: string[] = [];
    for (let i = 0; i < 5; i++) {
      const p = interaction.fields.getTextInputValue(`pergunta_${i}`).trim();
      if (p) novasPerguntas.push(p);
    }
    if (novasPerguntas.length === 0) {
      await interaction.reply({ content: "❌ Pelo menos uma pergunta é obrigatória.", ephemeral: true });
      return;
    }
    cfg.perguntas = novasPerguntas;
    writeData("whitelist-config", cfg);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2ECC71")
          .setTitle("✅ Perguntas atualizadas!")
          .setDescription(novasPerguntas.map((p, i) => `**${i + 1}.** ${p}`).join("\n"))
          .setTimestamp(),
      ],
      ephemeral: true,
    });
    return;
  }

  const field = interaction.customId.replace("wl_conf_modal_", "") as keyof WhitelistConfig;
  const valor = interaction.fields.getTextInputValue("valor").trim();
  (cfg as Record<string, string>)[field] = valor;
  writeData("whitelist-config", cfg);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#2ECC71")
        .setTitle("✅ Configuração salva!")
        .addFields({ name: field, value: valor || "(vazio)" })
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}
