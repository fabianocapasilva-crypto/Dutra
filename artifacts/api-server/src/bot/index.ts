import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  type Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  EmbedBuilder,
} from "discord.js";
import { logger } from "../lib/logger.js";

import { idCommands, handleIdCommand } from "./commands/id.js";
import {
  whitelistCommands,
  handleWhitelistCommand,
  handleWhitelistButton,
  handleWhitelistModal,
  handleWhitelistDecision,
  handleWhitelistConfSelect,
  handleWhitelistConfModal,
} from "./commands/whitelist.js";
import {
  ticketCommands,
  handleTicketCommand,
  handleTicketOpen,
  handleTicketClose,
  handleTicketConfSelect,
  handleTicketConfModal,
} from "./commands/ticket.js";
import { embedCommands, handleEmbedCommand } from "./commands/embed.js";
import {
  confCommands,
  handleConfCommand,
  handleConfSelectCommand,
  handleConfModal,
  hasCommandPermission,
} from "./commands/conf.js";

const allCommands = [
  ...idCommands,
  ...whitelistCommands,
  ...ticketCommands,
  ...embedCommands,
  ...confCommands,
];

// ── Permission denied reply ───────────────────────────────────────────────────

async function denyPermission(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#E74C3C")
        .setTitle("🚫 Sem Permissão")
        .setDescription(
          `Você não tem o cargo necessário para usar **/${interaction.commandName}**.\n` +
          `Um administrador pode ajustar as permissões com \`/conf\`.`
        )
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

// ── Bot startup ───────────────────────────────────────────────────────────────

export async function startBot(): Promise<void> {
  const token = process.env["DISCORD_TOKEN"];

  if (!token) {
    logger.warn("DISCORD_TOKEN não configurado — bot Discord não iniciado.");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
  });

  // ── Register slash commands ───────────────────────────────────────────────

  client.once("ready", async (c) => {
    logger.info({ tag: c.user.tag }, "Bot Discord conectado");

    const rest = new REST({ version: "10" }).setToken(token);
    try {
      await rest.put(Routes.applicationCommands(c.user.id), {
        body: allCommands,
      });
      logger.info("Slash commands registrados globalmente");
    } catch (err) {
      logger.error({ err }, "Erro ao registrar slash commands");
    }
  });

  // ── Interaction handler ───────────────────────────────────────────────────

  client.on("interactionCreate", async (interaction: Interaction) => {
    try {
      // ── Slash commands ────────────────────────────────────────────────────
      if (interaction.isChatInputCommand()) {
        const i = interaction as ChatInputCommandInteraction;
        const name = i.commandName;

        // /conf is always accessible to admins (already gated by Discord perms)
        if (name === "conf") {
          await handleConfCommand(i);
          return;
        }

        // Check role permission for all other commands
        if (!hasCommandPermission(i, name)) {
          await denyPermission(i);
          return;
        }

        if (["pedir-id", "ver-id", "definir-id-inicial"].includes(name)) {
          await handleIdCommand(i);
          return;
        }
        if (["whitelist", "whitelist-conf"].includes(name)) {
          await handleWhitelistCommand(i);
          return;
        }
        if (["ticket", "ticket-configurar"].includes(name)) {
          await handleTicketCommand(i);
          return;
        }
        if (name === "embed") {
          await handleEmbedCommand(i);
          return;
        }
        return;
      }

      // ── Buttons ───────────────────────────────────────────────────────────
      if (interaction.isButton()) {
        const i = interaction as ButtonInteraction;
        const id = i.customId;

        if (id === "wl_aplicar") {
          await handleWhitelistButton(i);
          return;
        }
        if (id.startsWith("wl_aprovar_") || id.startsWith("wl_negar_")) {
          await handleWhitelistDecision(i);
          return;
        }
        if (id.startsWith("ticket_abrir_")) {
          await handleTicketOpen(i);
          return;
        }
        if (id.startsWith("ticket_fechar_")) {
          await handleTicketClose(i);
          return;
        }
        return;
      }

      // ── Select menus ──────────────────────────────────────────────────────
      if (interaction.isStringSelectMenu()) {
        const i = interaction as StringSelectMenuInteraction;
        const id = i.customId;

        if (id === "conf_select_command") {
          await handleConfSelectCommand(i);
          return;
        }
        if (id === "wl_conf_select") {
          await handleWhitelistConfSelect(i);
          return;
        }
        if (id === "ticket_conf_select") {
          await handleTicketConfSelect(i);
          return;
        }
        return;
      }

      // ── Modals ────────────────────────────────────────────────────────────
      if (interaction.isModalSubmit()) {
        const i = interaction as ModalSubmitInteraction;
        const id = i.customId;

        if (id.startsWith("conf_modal_")) {
          await handleConfModal(i);
          return;
        }
        if (id === "wl_modal") {
          await handleWhitelistModal(i);
          return;
        }
        if (id === "wl_conf_perguntas_modal" || id.startsWith("wl_conf_modal_")) {
          await handleWhitelistConfModal(i);
          return;
        }
        if (id.startsWith("ticket_conf_modal_")) {
          await handleTicketConfModal(i);
          return;
        }
        return;
      }
    } catch (err) {
      logger.error({ err }, "Erro ao processar interação");
      try {
        const reply = {
          content: "❌ Ocorreu um erro ao processar esse comando.",
          ephemeral: true,
        };
        const anyI = interaction as ButtonInteraction;
        if (anyI.replied || anyI.deferred) {
          await anyI.followUp(reply);
        } else {
          await anyI.reply(reply);
        }
      } catch {
        // ignore
      }
    }
  });

  await client.login(token);
}
