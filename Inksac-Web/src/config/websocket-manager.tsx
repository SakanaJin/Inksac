import { notifications } from "@mantine/notifications";
import { WSCodes, type WSMessage, type WSType } from "../constants/types";

type MessageHandler = (message: WSMessage) => Promise<any> | void;
export type MessageHandlers = Partial<Record<WSType, MessageHandler>>;

type CloseHandler = (event?: CloseEvent) => void;
export type CloseHandlers = Partial<Record<WSCodes, CloseHandler>>;

export class WSManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private messageHandlers: MessageHandlers = {} as MessageHandlers;
  private closeHandlers: CloseHandlers = {} as CloseHandlers;
  private defaultCloseHandlers: CloseHandlers = {
    [WSCodes.NORMAL_CLOSURE]: () => {
      return;
    },
    [WSCodes.GOING_AWAY]: () => {
      return;
    },
    [WSCodes.INTERNAL_SERVER_ERROR]: () => {
      this.reconnect();
      return;
    },
    [WSCodes.UNEXPECTED_ERROR]: () => {
      this.reconnect();
      return;
    },
    [WSCodes.POLICY_VIOLATION]: (event) => {
      console.error("Connection refused, ", event.reason);
      notifications.show({
        title: "Error",
        message: `Connection refused, ${event.reason}`,
        color: "red",
      });
    },
    [WSCodes.FORCE_DC]: (event) => {
      console.error("Connection closed, ", event.reason);
      notifications.show({
        title: "Error",
        message: `Connection closed, ${event.reason}`,
        color: "red",
      });
    },
  };

  constructor(
    url: string,
    messageHandlers: MessageHandlers,
    closeHandlers?: CloseHandlers,
  ) {
    this.url = url;
    this.messageHandlers = messageHandlers;
    this.closeHandlers = { ...this.defaultCloseHandlers, ...closeHandlers };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message: WSMessage = JSON.parse(event.data);
        this.handleMessage(message);
      };

      this.ws.onclose = (event) => {
        console.log("WS disconnected");
        this.handleClose(event);
      };

      this.ws.onerror = (error) => {
        reject(error);
      };
    });
  }

  send(message: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  close() {
    this.ws?.close(1000);
  }

  isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private reconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000); //1 - 10 seconds
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }

  private async handleMessage(message: WSMessage) {
    const handler = this.messageHandlers[message.Mtype];
    if (handler) {
      const response = await handler(message);
      if (response) {
        return response;
      }
    } else {
      console.log("no handler for Mtype: ", message.Mtype);
    }
  }

  private handleClose(event: CloseEvent) {
    const handler = this.closeHandlers[event.code];
    if (handler) {
      handler(event);
    } else {
      this.reconnect();
    }
  }
}
