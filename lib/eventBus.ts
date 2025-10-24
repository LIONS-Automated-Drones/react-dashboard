import mitt from "mitt";

export type Events = {
  captureScreenshot: void;
};

export const eventBus = mitt<Events>();

