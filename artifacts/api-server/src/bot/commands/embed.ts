import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";

export const embedCommands = [
  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Cria e envia um embed personalizado")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) =>
      o.setName("titulo").setDescription("Título do embed").setRequired(true).setMaxLength(256)
    )
    .addStringOption((o) =>
      o.setName("descricao").setDescription("Descrição do embed").setRequired(true).setMaxLength(4000)
    )
    .addChannelOption((o) =>
      o.setName("canal").setDescription("Canal onde o embed será enviado (padrão: canal atual)").setRequired(false)
    )
    .addStringOption((o) =>
      o.setName("cor").setDescription("Cor do embed em hex (ex: #FF5733)").setRequired(false)
    )
    .addStringOption((o) =>
      o.setName("url").setDescription("URL do título").setRequired(false)
    )
    .addStringOption((o) =>
      o.setName("thumbnail").setDescription("URL da imagem thumbnail").setRequired(false)
    )
    .addStringOption((o) =>
      o.setName("imagem").setDescription("URL da imagem principal").setRequired(false)
    )
    .addStringOption((o) =>
      o.setName("rodape").setDescription("Texto do rodapé (footer)").setRequired(false).setMaxLength(2048)
    )
    .addStringOption((o) =>
      o.setName("autor").setDescription("Nome do autor").setRequired(false).setMaxLength(256)
    ),
].map((c) => c.toJSON());

export async function handleEmbedCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const titulo = interaction.options.getString("titulo", true);
  const descricao = interaction.options.getString("descricao", true);
  const corRaw = interaction.options.getString("cor") ?? "#3498DB";
  const url = interaction.options.getString("url");
  const thumbnail = interaction.options.getString("thumbnail");
  const imagem = interaction.options.getString("imagem");
  const rodape = interaction.options.getString("rodape");
  const autor = interaction.options.getString("autor");
  const canalOption = interaction.options.getChannel("canal");

  // Validate color
  const corRegex = /^#[0-9A-Fa-f]{6}$/;
  const cor = corRegex.test(corRaw) ? corRaw : "#3498DB";

  const embed = new EmbedBuilder()
    .setColor(cor as `#${string}`)
    .setTitle(titulo)
    .setDescription(descricao)
    .setTimestamp();

  if (url) embed.setURL(url);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (imagem) embed.setImage(imagem);
  if (rodape) embed.setFooter({ text: rodape });
  if (autor) embed.setAuthor({ name: autor });

  // Determine channel to send
  const targetChannel = canalOption
    ? interaction.guild?.channels.cache.get(canalOption.id)
    : interaction.channel;

  if (!targetChannel || !("send" in targetChannel)) {
    await interaction.reply({
      content: "❌ Canal inválido ou sem permissão para enviar mensagens.",
      ephemeral: true,
    });
    return;
  }

  try {
    await (targetChannel as { send: Function }).send({ embeds: [embed] });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2ECC71")
          .setTitle("✅ Embed enviado!")
          .setDescription(`O embed foi enviado em ${targetChannel}.`)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } catch {
    await interaction.reply({
      content: "❌ Não consegui enviar o embed nesse canal. Verifique as permissões.",
      ephemeral: true,
    });
  }
}
