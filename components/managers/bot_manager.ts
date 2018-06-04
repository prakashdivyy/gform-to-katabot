import { Component } from "merapi";
import { IGformManager, IBotManager } from "interfaces/managers";

export default class BotManager extends Component implements IBotManager {
    private botSchema : any;

    constructor(private gformManager : IGformManager) {
        super();
        this.botSchema = {
            schema: "kata.ai/schema/kata-ml/1.0",
            flows: {
                fallback: {
                    fallback: true,
                    intents: {
                        fallbackIntent: {
                            fallback: true
                        }
                    },
                    states: {
                        init: {
                            initial: true,
                            end: true,
                            action: [
                                {
                                    name: "fallbackAction"
                                }
                            ],
                            transitions: {
                                init: {
                                    fallback: true
                                }
                            }
                        }
                    },
                    actions: {
                        fallbackAction: {
                            type: "text",
                            options: {
                                text: "Tolong jawab pertanyaan berikut dengan benar ya!"
                            }
                        }
                    }
                },
                form: {
                    intents: {
                        startForm: {
                            initial: true,
                            type: "data",
                            condition: "payload.startForm"
                        },
                        reenter: {
                            type: "command",
                            condition: "content == 'reenter'"
                        },
                        skip: {
                            type: "text",
                            condition: "content == 'skip' || content == 'lewat'",
                            priority: 2
                        },
                        freeText: {
                            type: "text",
                            priority: 1
                        }
                    },
                    states: {},
                    actions: {}
                },
            }
        };
    }

    public async createBot(url : string) : Promise<any> {
        const bot : any = Object.assign({}, this.botSchema);
        const formElement = await this.gformManager.parse(url);
        const question = [];
        if (formElement) {
            for (const q of formElement) {
                switch (q.type) {
                    case "short_answer":
                    case "paragraph":
                        question.push({
                            type: "text",
                            question: q.question,
                            required: q.required
                        });
                        break;
                    case "multiple_choice":
                        question.push({
                            type: "button",
                            question: q.question,
                            required: q.required,
                            buttons: q.answers.listAnswers,
                            otherAnswers: q.answers.otherAnswers
                        });
                        break;
                    case "dropdown":
                        question.push({
                            type: "button",
                            question: q.question,
                            required: q.required,
                            buttons: q.answers.listAnswers,
                            otherAnswers: false
                        });
                        break;
                    // case "checkboxes":
                    //     break;
                    // case "linear_scale":
                    //     break;
                    // case "label":
                    //     break;
                    // case "section":
                    //     break;
                    // case "date":
                    //     break;
                    // case "time":
                    //     break;
                    // case "image":
                    //     break;
                    // case "video":
                    //     break;
                    // case "file_upload":
                    //     break;
                }
            }
        }
        if (question.length > 0) {
            for (let ii = 0; ii < question.length; ii++) {
                const data = question[ii];
                const action : any = {};
                const states : any = {};
                switch (data.type) {
                    case "text":
                        action.type = "text";
                        action.options = {
                            text: data.question
                        };
                        break;
                    case "button":
                        const buttonActions : any = [];
                        data.buttons.forEach((e : any) => {
                            const payload : any = {};
                            payload[`bq${ii}`] = e;
                            buttonActions.push({
                                type: "postback",
                                label: e,
                                displayText: e,
                                payload
                            });
                        });
                        action.type = "template";
                        action.options = {
                            type: "button",
                            items: {
                                text: data.question,
                                actions: buttonActions
                            }
                        };
                        bot.flows.form.intents[`bq${ii}`] = {
                            type: "data",
                            condition: `payload.bq${ii}`
                        };
                        break;
                }
                states.action = [{ name: `action${ii}` }];
                if (ii === 0) {
                    const transitionsInit : any = {};
                    transitionsInit[`question${ii}`] = {
                        fallback: true
                    };
                    bot.flows.form.states.init = {
                        initial: true,
                        transitions: transitionsInit
                    };
                }
                states.transitions = {};
                if (data.type === "text") {
                    const context : any = {};
                    context[`question${ii}`] = "content";
                    states.transitions[`question${ii + 1}`] = {
                        condition: "intent == 'fastText'",
                        mapping: {
                            context
                        }
                    };
                } else if (data.type === "button") {
                    const context : any = {};
                    context[`question${ii}`] = `payload.bq${ii}`;
                    states.transitions[`question${ii + 1}`] = {
                        condition: `intent == 'bq${ii}'`,
                        mapping: {
                            context
                        }
                    };
                    if (data.otherAnswers) {
                        // tslint:disable-next-line:max-line-length
                        states.transitions[`question${ii + 1}`].condition = states.transitions[`question${ii + 1}`].condition + " || intent == 'freeText'";
                        // tslint:disable-next-line:max-line-length
                        states.transitions[`question${ii + 1}`].mapping.context[`question${ii}`] = states.transitions[`question${ii + 1}`].mapping.context[`question${ii}`] + " || (intent == 'freeText') ? content : null";
                    }
                }
                if (!data.required) {
                    // tslint:disable-next-line:max-line-length
                    states.transitions[`question${ii + 1}`].condition = states.transitions[`question${ii + 1}`].condition + " || intent == 'skip'";
                }
                if (ii + 1 === question.length) {
                    states.transitions.end = states.transitions[`question${ii + 1}`];
                    delete states.transitions[`question${ii + 1}`];
                    bot.flows.form.states.end = {
                        end: true,
                        action: [{ name: "showResult" }]
                    };
                    bot.flows.form.actions.showResult = {
                        type: "text",
                        options: {
                            text: "Terima kasih telah mengisi form ini"
                        }
                    };
                }
                states.transitions[`question${ii}`] = {
                    fallback: true
                };
                bot.flows.form.actions[`question${ii}`] = action;
                bot.flows.form.states[`question${ii}`] = states;
            }
        }
        return bot;
    }
}
