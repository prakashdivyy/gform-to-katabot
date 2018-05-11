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
                }
            }
        };
    }

    public async createBot(url : string) : Promise<any> {
        const bot = Object.assign({}, this.botSchema);
        const formElement = await this.gformManager.parse(url);
        return formElement;
    }
}
