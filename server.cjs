const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();

const PORT = 3001;

/*
 * ========================================
 * React本番ファイル
 * ========================================
 */

const distPath = path.join(__dirname, "dist");

app.use(express.static(distPath));

/*
 * ========================================
 * HTTPサーバー
 * ========================================
 */

const server = http.createServer(app);

/*
 * ========================================
 * WebSocketサーバー
 * ========================================
 */

const wss = new WebSocketServer({
  server,
  path: "/ws",
});

/*
 * ========================================
 * 接続中のクライアント一覧
 * ========================================
 */

const clients = new Set();

/*
 * ========================================
 * WebSocket接続
 * ========================================
 */

wss.on("connection", (ws) => {
  console.log(
    "WebSocket接続:",
    clients.size + 1
  );

  clients.add(ws);

  /*
   * クライアント切断
   */

  ws.on("close", () => {
    clients.delete(ws);

    console.log(
      "WebSocket切断:",
      clients.size
    );
  });

  /*
   * エラー
   */

  ws.on("error", (error) => {
    console.error(
      "WebSocketエラー:",
      error
    );

    clients.delete(ws);
  });

  /*
   * メッセージ受信
   */

  ws.on("message", (message) => {
    try {
      const data =
        JSON.parse(
          message.toString()
        );

      console.log(
        "受信:",
        data
      );

      /*
       * 受信したガチャ情報を
       * 接続中の全クライアントへ送信
       */

      const messageString =
        JSON.stringify(data);

      for (const client of clients) {
        if (
          client.readyState === 1
        ) {
          client.send(
            messageString
          );
        }
      }
    } catch (error) {
      console.error(
        "メッセージ処理エラー:",
        error
      );
    }
  });
});

/*
 * ========================================
 * Overlay
 * ========================================
 */

app.get(
  "/overlay",
  (req, res) => {
    res.sendFile(
      path.join(
        distPath,
        "index.html"
      )
    );
  }
);

/*
 * ========================================
 * ルート
 * ========================================
 */

app.get(
  "/",
  (req, res) => {
    res.sendFile(
      path.join(
        distPath,
        "index.html"
      )
    );
  }
);

/*
 * ========================================
 * サーバー起動
 * ========================================
 */

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "========================================"
    );

    console.log(
      "Gacha本番サーバー起動"
    );

    console.log(
      `操作画面: http://localhost:${PORT}/`
    );

    console.log(
      `Overlay: http://localhost:${PORT}/overlay`
    );

    console.log(
      `WebSocket: ws://localhost:${PORT}/ws`
    );

    console.log(
      "========================================"
    );
  }
);