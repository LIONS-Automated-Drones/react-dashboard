import { FoxgloveViewer } from "@foxglove/embed-react";
import layoutData from "./foxglove-layout.json"; // your exported file

export default function TwinViewer() {
  return (
    <div style={{ height: "100vh" }}>
      <FoxgloveViewer
        orgSlug="sd1"
        layoutData={layoutData}
        data={{
          type: "live",
          url: "ws://localhost:8765",
          protocol: "foxglove-websocket",
        }}
        onError={(err) => alert(`Foxglove error: ${err}`)}
        />
    </div>
  );
}