import React from "react";

const TaskStatus = ({ status }) => {
  if (!status) return null;

  const getStatusColor = (statusType) => {
    switch (statusType) {
      case "planning":
        return "#ffad1f";
      case "executing":
        return "#1da1f2";
      case "validating":
        return "#17bf63";
      case "completed":
        return "#17bf63";
      case "error":
        return "#e0245e";
      case "failed":
        return "#e0245e";
      case "cancelled":
        return "#657786";
      default:
        return "#657786";
    }
  };

  const getStatusIcon = (statusType) => {
    switch (statusType) {
      case "planning":
        return "🤔";
      case "executing":
        return "⚡";
      case "validating":
        return "✅";
      case "completed":
        return "🎉";
      case "error":
        return "❌";
      case "failed":
        return "⚠️";
      case "cancelled":
        return "🛑";
      default:
        return "⏳";
    }
  };

  const getStatusMessage = (statusType) => {
    switch (statusType) {
      case "planning":
        return "Analyzing your request...";
      case "executing":
        return "Your task is being executed by AI agent";
      case "validating":
        return "Verifying task completion...";
      case "completed":
        return "Task completed successfully!";
      case "error":
        return "An error occurred during execution";
      case "failed":
        return "Task execution failed";
      case "cancelled":
        return "Task was cancelled";
      default:
        return "Processing your request...";
    }
  };

  const statusColor = getStatusColor(status.status);

  return (
    <div
      className="task-status-container toast-enter"
      style={{
        padding: "8px 16px",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexShrink: 0,
        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        animation: "slideFadeIn 0.4s ease-out forwards",
      }}
    >
      <div
        className={`status-indicator ${status.status === "executing" ? "status-pulse" : ""}`}
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: statusColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          flexShrink: 0,
          boxShadow: `0 0 8px ${statusColor}66, 0 2px 4px rgba(0,0,0,0.1)`,
          transition: "all 0.3s ease",
          position: "relative"
        }}
      >
        {status.status === "executing" ? (
          <>
            <div
              className="loader"
              style={{
                width: "16px",
                height: "16px",
                aspectRatio: "1",
                display: "grid",
                color: "#ffffff",
                background:
                  "radial-gradient(farthest-side, currentColor calc(100% - 2px), #0000 calc(100% - 1px) 0)",
                WebkitMask:
                  "radial-gradient(farthest-side, #0000 calc(100% - 4px), #000 calc(100% - 3px))",
                mask: "radial-gradient(farthest-side, #0000 calc(100% - 4px), #000 calc(100% - 3px))",
                borderRadius: "50%",
                animation: "l19 1.5s infinite linear",
              }}
            >
              <div
                style={{
                  content: '""',
                  gridArea: "1/1",
                  background: `
                   linear-gradient(currentColor 0 0) center,
                   linear-gradient(currentColor 0 0) center
                 `,
                  backgroundSize: "100% 2px, 2px 100%",
                  backgroundRepeat: "no-repeat",
                }}
              />
              <div
                style={{
                  content: '""',
                  gridArea: "1/1",
                  background: `
                   linear-gradient(currentColor 0 0) center,
                   linear-gradient(currentColor 0 0) center
                 `,
                  backgroundSize: "100% 2px, 2px 100%",
                  backgroundRepeat: "no-repeat",
                  transform: "rotate(45deg)",
                }}
              />
            </div>
            {/* Typing indicator dots */}
            <div className="typing-indicator" style={{
              position: "absolute",
              bottom: "-8px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "3px",
              whiteSpace: "nowrap"
            }}>
              <span style={{ animationDelay: "0s" }}></span>
              <span style={{ animationDelay: "0.2s" }}></span>
              <span style={{ animationDelay: "0.4s" }}></span>
            </div>
          </>
        ) : (
          <span style={{ fontSize: "11px", transform: "scale(1.2)" }}>
            {getStatusIcon(status.status)}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="float-label"
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--text-primary, #f1f5f9)",
            lineHeight: "16px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {getStatusMessage(status.status)}
        </div>

        {status.status === "executing" && status.message && (
          <div
            className="shimmer-loading"
            style={{
              fontSize: "11px",
              color: "var(--text-secondary, rgba(241,245,249,0.7))",
              marginTop: "3px",
              lineHeight: "13px",
              fontStyle: "italic",
              borderRadius: "4px",
              padding: "2px 8px",
              backgroundSize: "200% 100%"
            }}
          >
            {status.message}
          </div>
        )}

        {status.status === "planning" && (
          <div className="typing-indicator" style={{ marginTop: "4px" }}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      {/* Progress ring for executing */}
      {status.status === "executing" && (
        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.1)",
          borderTopColor: statusColor,
          animation: "spin 1s linear infinite",
          flexShrink: 0
        }} />
      )}

      {status.status === "completed" && (
        <div className="scale-in" style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "#17bf63",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          color: "white",
          flexShrink: 0
        }}>
          ✓
        </div>
      )}
    </div>
  );
};

export default TaskStatus;
