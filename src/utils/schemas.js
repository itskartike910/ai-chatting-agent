// Action Schemas (inspired by Nanobrowser)
export const ActionSchemas = {
  click_element: {
    type: "object",
    properties: {
      intent: { type: "string", description: "Purpose of this click action" },
      index: { type: "integer", description: "Element index from DOM tree" },
      description: { type: "string", description: "What element is being clicked" }
    },
    required: ["intent", "index"]
  },
  
  input_text: {
    type: "object", 
    properties: {
      intent: { type: "string", description: "Purpose of text input" },
      index: { type: "integer", description: "Element index for input field" },
      text: { type: "string", description: "Text to input" }
    },
    required: ["intent", "index", "text"]
  },
  
  navigate_to_url: {
    type: "object",
    properties: {
      intent: { type: "string", description: "Purpose of navigation" },
      url: { type: "string", description: "URL to navigate to" }
    },
    required: ["intent", "url"]
  },
  
  wait: {
    type: "object",
    properties: {
      intent: { type: "string", description: "Reason for waiting" },
      duration: { type: "integer", description: "Wait time in milliseconds" }
    },
    required: ["intent"]
  },
  
  scroll_down: {
    type: "object",
    properties: {
      intent: { type: "string", description: "Purpose of scrolling" },
      distance: { type: "integer", description: "Scroll distance in pixels", default: 500 }
    },
    required: ["intent"]
  },
  
  done: {
    type: "object",
    properties: {
      intent: { type: "string", description: "Task completion summary" },
      success: { type: "boolean", description: "Whether task was successful" },
      result: { type: "string", description: "Final result description" },
      confidence: { type: "number", description: "Confidence level 0-1" }
    },
    required: ["intent", "success", "result"]
  }
};

// Response Schemas for Agents
export const AgentSchemas = {
  planner: {
    type: "object",
    properties: {
      observation: { type: "string", description: "Current state analysis" },
      done: { type: "boolean", description: "Whether task is complete" },
      next_steps: { type: "string", description: "Next actions to take" },
      reasoning: { type: "string", description: "Explanation of approach" },
      web_task: { type: "boolean", description: "Whether this is a web automation task" },
      platform: { type: "string", enum: ["twitter", "linkedin", "facebook", "instagram", "unknown"] },
      required_navigation: { type: ["string", "null"], description: "URL if navigation needed" },
      completion_criteria: { type: "string", description: "How to determine task completion" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      actions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            description: { type: "string" },
            params: { type: "object" }
          }
        }
      }
    },
    required: ["observation", "done", "next_steps", "reasoning", "web_task", "platform"]
  },
  
  navigator: {
    type: "object",
    properties: {
      current_state: {
        type: "object",
        properties: {
          evaluation_previous_goal: { type: "string", description: "Analysis of previous step" },
          memory: { type: "string", description: "What to remember" },
          next_goal: { type: "string", description: "Next immediate action" }
        },
        required: ["evaluation_previous_goal", "memory", "next_goal"]
      },
      actions: {
        type: "array",
        description: "Sequence of actions to execute",
        items: {
          type: "object",
          oneOf: Object.keys(ActionSchemas).map(action => ({
            properties: { [action]: ActionSchemas[action] },
            required: [action]
          }))
        }
      },
      confidence: { type: "number", minimum: 0, maximum: 1 }
    },
    required: ["current_state", "actions"]
  },
  
  validator: {
    type: "object", 
    properties: {
      is_valid: { type: "boolean", description: "Whether task completed successfully" },
      reason: { type: "string", description: "Explanation of validation result" },
      answer: { type: "string", description: "Final answer if valid" },
      success_confidence: { type: "number", minimum: 0, maximum: 1 },
      completion_evidence: { type: "string", description: "Evidence of completion" },
      platform_specific_validation: { 
        type: "object",
        properties: {
          platform: { type: "string" },
          specific_checks: { type: "array", items: { type: "string" } },
          success_indicators: { type: "array", items: { type: "string" } }
        }
      },
      suggestions: {
        type: "array",
        items: { type: "string" },
        description: "Suggestions for improvement if task failed"
      }
    },
    required: ["is_valid", "reason", "answer"]
  }
};

// Schema validation function
export function validateSchema(data, schema) {
  try {
    // Basic validation implementation
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          return { 
            valid: false, 
            error: `Missing required field: ${field}`,
            field: field
          };
        }
      }
    }
    
    // Type validation
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          const value = data[key];
          const expectedType = propSchema.type;
          
          if (expectedType && !validateType(value, expectedType)) {
            return {
              valid: false,
              error: `Field '${key}' should be of type '${expectedType}', got '${typeof value}'`,
              field: key
            };
          }
          
          // Enum validation
          if (propSchema.enum && !propSchema.enum.includes(value)) {
            return {
              valid: false,
              error: `Field '${key}' should be one of: ${propSchema.enum.join(', ')}`,
              field: key
            };
          }
        }
      }
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function validateType(value, expectedType) {
  if (Array.isArray(expectedType)) {
    return expectedType.some(type => validateSingleType(value, type));
  }
  return validateSingleType(value, expectedType);
}

function validateSingleType(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':
      return value === null;
    default:
      return true;
  }
}

// Helper function to clean and parse JSON responses
export function parseAgentResponse(response, agentType) {
  try {
    // Clean the response
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    
    // Validate against schema
    const schema = AgentSchemas[agentType];
    if (schema) {
      const validation = validateSchema(parsedData, schema);
      if (!validation.valid) {
        console.warn(`Schema validation failed for ${agentType}:`, validation.error);
        // Return data anyway but log the warning
      }
    }
    
    return { success: true, data: parsedData };
  } catch (error) {
    console.error(`Failed to parse ${agentType} response:`, error);
    return { 
      success: false, 
      error: error.message,
      fallback: getDefaultResponse(agentType)
    };
  }
}

function getDefaultResponse(agentType) {
  const defaults = {
    planner: {
      observation: "Unable to parse planner response",
      done: false,
      next_steps: "Review current state and try again",
      reasoning: "Error in response parsing",
      web_task: true,
      platform: "unknown",
      confidence: "low"
    },
    navigator: {
      current_state: {
        evaluation_previous_goal: "Unknown - response parsing failed",
        memory: "Error occurred in navigation planning",
        next_goal: "Retry current action"
      },
      actions: [],
      confidence: 0
    },
    validator: {
      is_valid: false,
      reason: "Unable to validate due to parsing error",
      answer: "Validation failed - please retry",
      success_confidence: 0
    }
  };
  
  return defaults[agentType] || {};
}