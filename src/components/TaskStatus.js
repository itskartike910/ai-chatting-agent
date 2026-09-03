import React from "react";
import {
  FaBolt,
  FaBrain,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPause,
  FaTimesCircle
} from "react-icons/fa";

const TaskStatus = ({ status }) => {
  if (!status) return null;

  const getStatusConfig = (statusType) => {
    switch (statusType) {
      case "planning":
        return {
          color: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.15)",
          border: "rgba(245, 158, 11, 0.35)",
          icon: <FaBrain style={{ fontSize: "11px" }} />,
          title: "Planning Strategy",
          isLive: true
        };
      case "executing":
        return {
          color: "#818cf8",
          bg: "rgba(99, 102, 241, 0.15)",
          border: "rgba(99, 102, 241, 0.35)",
          icon: <FaBolt style={{ fontSize: "11px" }} />,
          title: "AI Agent Executing",
          isLive: true
        };
      case "validating":
        return {
          color: "#10b981",
          bg: "rgba(16, 185, 129, 0.15)",
          border: "rgba(16, 185, 129, 0.35)",
          icon: <FaCheckCircle style={{ fontSize: "11px" }} />,
          title: "Verifying Goal",
          isLive: true
        };
      case "completed":
        return {
          color: "#10b981",
          bg: "rgba(16, 185, 129, 0.15)",
          border: "rgba(16, 185, 129, 0.35)",
          icon: <FaCheckCircle style={{ fontSize: "11px" }} />,
          title: "Task Completed",
          isLive: false
        };
      case "paused":
        return {
          color: "#fbbf24",
          bg: "rgba(251, 191, 36, 0.15)",
          border: "rgba(251, 191, 36, 0.35)",
          icon: <FaPause style={{ fontSize: "10px" }} />,
          title: "Action Required",
          isLive: false
        };
      case "error":
      case "failed":
        return {
          color: "#ef4444",
          bg: "rgba(239, 68, 68, 0.15)",
          border: "rgba(239, 68, 68, 0.35)",
          icon: <FaExclamationTriangle style={{ fontSize: "11px" }} />,
          title: "Execution Error",
          isLive: false
        };
      case "cancelled":
        return {
          color: "#94a3b8",
          bg: "rgba(148, 163, 184, 0.15)",
          border: "rgba(148, 163, 184, 0.35)",
          icon: <FaTimesCircle style={{ fontSize: "11px" }} />,
          title: "Task Cancelled",
          isLive: false
        };
      default:
        return {
          color: "#818cf8",
          bg: "rgba(99, 102, 241, 0.15)",
          border: "rgba(99, 102, 241, 0.35)",
          icon: <FaBolt style={{ fontSize: "11px" }} />,
          title: "Processing",
          isLive: true
        };
    }
  };

  const config = getStatusConfig(status.status);

  return (
    <div
      className="task-status-container"
      style={{
        padding: "8px 14px",
        backgroundColor: "rgba(10, 15, 30, 0.9)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${config.border}`,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexShrink: 0,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
        position: "relative",
        zIndex: 5,
        animation: "slideInDown 0.3s ease-out forwards"
      }}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "8px",
          backgroundColor: config.bg,
          border: `1px solid ${config.border}`,
          color: config.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 0 10px ${config.color}33`,
          transition: "all 0.3s ease"
        }}
      >
        {config.icon}
      </div>

      {/* Main Status Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: "#f1f5f9",
            lineHeight: "15px",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          {config.title}
          {config.isLive && (
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: config.color,
                boxShadow: `0 0 6px ${config.color}`,
                animation: "pulse 1.5s infinite"
              }}
            />
          )}
        </div>

        {status.message && (
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-secondary, rgba(241, 245, 249, 0.7))",
              marginTop: "2px",
              lineHeight: "14px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {status.message}
          </div>
        )}
      </div>

      {/* Right Progress Spinner / Badge */}
      {config.isLive && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0
          }}
        >
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              border: `2px solid rgba(255, 255, 255, 0.1)`,
              borderTopColor: config.color,
              animation: "spin 0.8s linear infinite"
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TaskStatus;
