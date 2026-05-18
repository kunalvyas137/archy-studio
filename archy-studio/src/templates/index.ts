export const TEMPLATES: Record<string, string> = {
  inboundcall: `inboundCall:
  name: "{{flowName}}"
  division: "{{division}}"
  defaultLanguage: en-us
  startUpRef: "/inboundCall/menus/menu[Welcome_Menu]"
  initialGreeting:
    tts: "Welcome to {{orgName}}."
  menus:
    - menu:
        name: Welcome_Menu
        actions:
          - transferToAcd:
              queueName: "{{queueName}}"
`,

  inboundemail: `inboundEmail:
  name: "{{flowName}}"
  division: "{{division}}"
  defaultLanguage: en-us
  startUpRef: "/inboundEmail/states/state[Initial_State]"
  states:
    - state:
        name: Initial_State
        actions:
          - transferToAcd:
              queueName: "{{queueName}}"
`,

  inboundshortmessage: `inboundShortMessage:
  name: "{{flowName}}"
  division: "{{division}}"
  defaultLanguage: en-us
  startUpRef: "/inboundShortMessage/menus/menu[Welcome_Menu]"
  menus:
    - menu:
        name: Welcome_Menu
        actions:
          - transferToAcd:
              queueName: "{{queueName}}"
`,

  outboundcall: `outboundCall:
  name: "{{flowName}}"
  division: "{{division}}"
  defaultLanguage: en-us
  startUpRef: "/outboundCall/states/state[Initial_State]"
  states:
    - state:
        name: Initial_State
        actions:
          - disconnect:
              none: true
`,

  workflow: `workflow:
  name: "{{flowName}}"
  division: "{{division}}"
  startUpRef: "/workflow/states/state[Initial_State]"
  variables:
    - variable:
        name: Flow.InputData
        type: String
        initialValue:
          lit: ""
  states:
    - state:
        name: Initial_State
        actions:
          - updateData:
              statements:
                - string:
                    variable: Flow.InputData
                    value:
                      lit: "processed"
`,

  commonmodule: `commonModule:
  name: "{{flowName}}"
  division: "{{division}}"
  compatibleFlowTypes:
    - flowType: inboundCall
    - flowType: inboundEmail
  inputOutputVariables:
    - variable:
        name: Flow.Result
        type: String
        inputOutputType: Output
  startUpRef: "/commonModule/states/state[Initial_State]"
  states:
    - state:
        name: Initial_State
        actions:
          - updateData:
              statements:
                - string:
                    variable: Flow.Result
                    value:
                      lit: "success"
`,
};
