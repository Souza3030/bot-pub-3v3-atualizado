import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";

import http from "http";

import { Arena } from "./arena";
import { handleCommand } from "./commands";
import { config } from "./config";
import { MODE } from "./mode";

const PORT = Number(process.env.PORT) || 3000;

// Servidor HTTP para o Render detectar a porta
http
  .createServer((_req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
    });

    res.end("Bot está rodando!");
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`[HTTP] Servidor ativo na porta ${PORT}`);
  });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const arena = new Arena();

globalThis.botClient = client;

client.once(Events.ClientReady, async () => {
  try {
    const guild = await client.guilds.fetch(
      config.discord.guildId
    );

    await arena.ready(guild);

    console.log(
      `[MamoBall] ${MODE.label} online como ${client.user?.tag}`
    );
  } catch (error) {
    console.error("[ClientReady] Erro ao iniciar:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction, arena);
      return;
    }

    if (interaction.isButton()) {
      await arena.handleButton(interaction);
      return;
    }
  } catch (error) {
    console.error("[Interaction]", error);

    if (!interaction.isRepliable()) return;

    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: "Falha interna.",
        });

        return;
      }

      if (interaction.replied) {
        await interaction.followUp({
          content: "Falha interna.",
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      await interaction.reply({
        content: "Falha interna.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      console.error(
        "[Interaction] Falha ao responder:",
        replyError
      );
    }
  }
});

client.on(Events.Error, (error) => {
  console.error("[Discord Client]", error);
});

client.login(config.discord.token).catch((error) => {
  console.error("Falha ao conectar.", error);
  process.exit(1);
});