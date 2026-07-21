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
  ChannelType,
  TextChannel,
  OverwriteType,
} from "discord.js";
import {
  readData,
  writeData,
  defaultTicketConfig,
  type TicketConfig,
} from "../data.js";

export const ticketCommands = [
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Envia o painel de tickets no canal atual"),

  new SlashCommandBuilder()
    .setName("ticket-configurar")
    .setDescription("Configura o sistema de tickets")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((c) => c.toJSON());

// ── /ticket ──────────────────────────────────────────────────────────────────

export async function handleTicketCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (interaction.commandName === "ticket") {
    const cfg = readData<TicketConfig>("ticket-config", defaultTicketConfig);

    const embed = new EmbedBuilder()
      .setColor(cfg.cor as `#${string}`)
      .setTitle(cfg.nome)
      .setDescription(cfg.descricao)
      .setTimestamp();

    if (cfg.thumbnail) embed.setThumbnail(cfg.thumbnail);
    if (cfg.url) embed.setURL(cfg.url);
    if (cfg.autor) embed.setAuthor({ name: cfg.autor });

    const tipos = cfg.tipos.slice(0, 5);
    const buttons = tipos.map((tipo) =>
      new ButtonBuilder()
        .setCustomId(`ticket_abrir_${tipo}`)
        .setLabel(`🎫 ${tipo}`)
        .setStyle(ButtonStyle.Primary)
    );

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5))
      );
    }

    await interaction.reply({ embeds: [embed], components: rows });
    return;
  }

  if (interaction.commandName === "ticket-configurar") {
    await sendTicketConfPanel(interaction);
  }
}

async function sendTicketConfPanel(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const cfg = readData<TicketConfig>("ticket-config", defaultTicketConfig);

  const embed = new EmbedBuilder()
    .setColor("#9B59B6")
    .setTitle("⚙️ Configurações do Ticket")
    .setDescription("Selecione o que deseja configurar:")
    .addFields(
      { name: "📝 Nome", value: cfg.nome, inline: true },
      { name: "📄 Descrição", value: cfg.descricao.slice(0, 50), inline: true },
      { name: "👤 Autor", value: cfg.autor || "—", inline: true },
      { name: "🎨 Cor", value: cfg.cor, inline: true },
      { name: "🔗 URL", value: cfg.url || "—", inline: true },
      { name: "🖼️ Thumbnail", value: cfg.thumbnail ? "✅" : "—", inline: true },
      { name: "🎫 Tipos", value: cfg.tipos.join(", "), inline: false },
      { name: "📋 Canal de Logs", value: cfg.canalLogs || "—", inline: true }
    );

  const select = new StringSelectMenuBuilder()
    .setCustomId("ticket_conf_select")
    .setPlaceholder("Selecione uma configuração...")
    .addOptions([
      { label: "📝 Nome", value: "nome", description: "Título do painel" },
      { label: "📄 Descrição", value: "descricao", description: "Descrição do painel" },
      { label: "👤 Autor", value: "autor", description: "Nome do autor do embed" },
      { label: "🎨 Cor", value: "cor", description: "Cor do embed (#hex)" },
      { label: "🔗 URL", value: "url", description: "Link do título" },
      { label: "🖼️ Thumbnail", value: "thumbnail", description: "URL da imagem" },
      { label: "🎫 Tipos de Ticket", value: "tipos", description: "Nomes dos botões (separados por vírgula)" },
      { label: "📋 Canal de Logs", value: "canalLogs", description: "ID do canal de logs" },
    ]);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ── Button: Abrir ticket ──────────────────────────────────────────────────────

export async function handleTicketOpen(
  interaction: ButtonInteraction
): Promise<void> {
  const tipo = interaction.customId.replace("ticket_abrir_", "");
  const cfg = readData<TicketConfig>("ticket-config", defaultTicketConfig);

  if (!interaction.guild) {
    await interaction.reply({ content: "❌ Só funciona em servidores.", ephemeral: true });
    return;
  }

  // Check if user already has an open ticket of this type
  const existingChannel = interaction.guild.channels.cache.find(
    (c) =>
      c.name === `ticket-${tipo.toLowerCase().replace(/\s+/g, "-")}-${interaction.user.username.toLowerCase()}` &&
      c.type === ChannelType.GuildText
  );

  if (existingChannel) {
    await interaction.reply({
      content: `❌ Você já tem um ticket aberto: ${existingChannel}`,
      ephemeral: true,
    });
    return;
  }

  const channelName = `ticket-${tipo.toLowerCase().replace(/\s+/g, "-")}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, "")}`;

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
        type: OverwriteType.Role,
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
        type: OverwriteType.Member,
      },
    ],
  });

  const embed = new EmbedBuilder()
    .setColor(cfg.cor as `#${string}`)
    .setTitle(`🎫 Ticket — ${tipo}`)
    .setDescription(
      `Olá ${interaction.user}! Seu ticket do tipo **${tipo}** foi criado.\n\nDescreva seu problema e aguarde um atendente.`
    )
    .setTimestamp();

  if (cfg.autor) embed.setAuthor({ name: cfg.autor });

  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_fechar_${channel.id}`)
      .setLabel("🔒 Fechar Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  await (channel as TextChannel).send({
    content: `${interaction.user}`,
    embeds: [embed],
    components: [closeRow],
  });

  // Log
  if (cfg.canalLogs) {
    const logChannel = interaction.guild.channels.cache.get(cfg.canalLogs) as TextChannel | undefined;
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#3498DB")
            .setTitle("📋 Ticket Aberto")
            .addFields(
              { name: "Usuário", value: `${interaction.user}`, inline: true },
              { name: "Tipo", value: tipo, inline: true },
              { name: "Canal", value: `${channel}`, inline: true }
            )
            .setTimestamp(),
        ],
      });
    }
  }

  await interaction.reply({
    content: `✅ Ticket criado: ${channel}`,
    ephemeral: true,
  });
}

// ── Button: Fechar ticket ─────────────────────────────────────────────────────

export async function handleTicketClose(
  interaction: ButtonInteraction
): Promise<void> {
  const cfg = readData<TicketConfig>("ticket-config", defaultTicketConfig);
  const channelId = interaction.customId.replace("ticket_fechar_", "");

  if (!interaction.guild) return;

  const embed = new EmbedBuilder()
    .setColor("#E74C3C")
    .setTitle("🔒 Ticket Fechado")
    .setDescription(`Ticket fechado por ${interaction.user}. Este canal será deletado em 5 segundos.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Log
  if (cfg.canalLogs) {
    const logChannel = interaction.guild.channels.cache.get(cfg.canalLogs) as TextChannel | undefined;
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#E74C3C")
            .setTitle("📋 Ticket Fechado")
            .addFields(
              { name: "Fechado por", value: `${interaction.user}`, inline: true },
              { name: "Canal", value: interaction.channel?.toString() ?? channelId, inline: true }
            )
            .setTimestamp(),
        ],
      });
    }
  }

  setTimeout(async () => {
    try {
      const ch = interaction.guild?.channels.cache.get(interaction.channelId);
      await ch?.delete();
    } catch {
      // already deleted
    }
  }, 5000);
}

// ── Select: Ticket conf ───────────────────────────────────────────────────────

export async function handleTicketConfSelect(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  const value = interaction.values[0];
  const cfg = readData<TicketConfig>("ticket-config", defaultTicketConfig);

  const labels: Record<string, string> = {
    nome: "Nome do Painel",
    descricao: "Descrição do Painel",
    autor: "Nome do Autor",
    cor: "Cor (#hex)",
    url: "URL do Título",
    thumbnail: "URL da Thumbnail",
    tipos: "Tipos de Ticket (separados por vírgula)",
    canalLogs: "ID do Canal de Logs",
  };

  const currentValues: Record<string, string> = {
    nome: cfg.nome,
    descricao: cfg.descricao,
    autor: cfg.autor,
    cor: cfg.cor,
    url: cfg.url,
    thumbnail: cfg.thumbnail,
    tipos: cfg.tipos.join(", "),
    canalLogs: cfg.canalLogs,
  };

  const isLong = value === "descricao" || value === "tipos";

  const modal = new ModalBuilder()
    .setCustomId(`ticket_conf_modal_${value}`)
    .setTitle(`Configurar: ${labels[value] ?? value}`);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("valor")
        .setLabel(labels[value] ?? value)
        .setStyle(isLong ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(false)
        .setValue(currentValues[value] ?? "")
        .setMaxLength(500)
    )
  );

  await interaction.showModal(modal);
}

// ── Modal: Ticket conf save ───────────────────────────────────────────────────

export async function handleTicketConfModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const cfg = readData<TicketConfig>("ticket-config", defaultTicketConfig);
  const field = interaction.customId.replace("ticket_conf_modal_", "") as keyof TicketConfig;
  const valor = interaction.fields.getTextInputValue("valor").trim();

  if (field === "tipos") {
    cfg.tipos = valor.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5);
  } else {
    (cfg as Record<string, string>)[field as string] = valor;
  }

  writeData("ticket-config", cfg);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#2ECC71")
        .setTitle("✅ Configuração salva!")
        .addFields({
          name: field as string,
          value: field === "tipos" ? cfg.tipos.join(", ") : valor || "(vazio)",
        })
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}
