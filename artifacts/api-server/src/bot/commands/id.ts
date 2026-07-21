import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { readData, writeData, defaultIdsData } from "../data.js";

export const idCommands = [
  new SlashCommandBuilder()
    .setName("pedir-id")
    .setDescription("Solicita um ID único para você"),

  new SlashCommandBuilder()
    .setName("ver-id")
    .setDescription("Veja o seu ID ou o de outro usuário")
    .addUserOption((o) =>
      o.setName("usuario").setDescription("Usuário para ver o ID (opcional)")
    ),

  new SlashCommandBuilder()
    .setName("definir-id-inicial")
    .setDescription("Define o número inicial dos IDs")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((o) =>
      o
        .setName("numero")
        .setDescription("Número inicial (ex: 1000)")
        .setRequired(true)
        .setMinValue(1)
    ),
].map((c) => c.toJSON());

export async function handleIdCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const data = readData("ids", defaultIdsData);

  if (interaction.commandName === "pedir-id") {
    const userId = interaction.user.id;

    if (data.users[userId] !== undefined) {
      const embed = new EmbedBuilder()
        .setColor("#E74C3C")
        .setTitle("❌ ID já existente")
        .setDescription(`Você já possui o ID **#${data.users[userId]}**.`)
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const newId = data.nextId;
    data.users[userId] = newId;
    data.nextId += 1;
    writeData("ids", data);

    const embed = new EmbedBuilder()
      .setColor("#2ECC71")
      .setTitle("✅ ID Registrado")
      .setDescription(
        `Parabéns, ${interaction.user}! Seu ID foi registrado com sucesso.`
      )
      .addFields({ name: "Seu ID", value: `**#${newId}**`, inline: true })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (interaction.commandName === "ver-id") {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const userId = target.id;
    const id = data.users[userId];

    if (id === undefined) {
      const embed = new EmbedBuilder()
        .setColor("#E74C3C")
        .setTitle("❌ Sem ID")
        .setDescription(
          target.id === interaction.user.id
            ? "Você ainda não possui um ID. Use `/pedir-id` para obter um."
            : `${target} ainda não possui um ID.`
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor("#3498DB")
      .setTitle("🪪 ID do Usuário")
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "Usuário", value: `${target}`, inline: true },
        { name: "ID", value: `**#${id}**`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (interaction.commandName === "definir-id-inicial") {
    const numero = interaction.options.getInteger("numero", true);

    if (Object.keys(data.users).length > 0) {
      const embed = new EmbedBuilder()
        .setColor("#E74C3C")
        .setTitle("❌ Não permitido")
        .setDescription(
          "Já existem IDs registrados. Não é possível redefinir o ID inicial."
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    data.nextId = numero;
    writeData("ids", data);

    const embed = new EmbedBuilder()
      .setColor("#2ECC71")
      .setTitle("✅ ID Inicial Definido")
      .setDescription(`O próximo ID a ser gerado será **#${numero}**.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
