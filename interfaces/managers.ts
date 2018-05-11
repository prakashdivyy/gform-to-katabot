export interface IGformManager {
    parse(uri : string) : Promise<any>;
}

export interface IBotManager {
    createBot(uri : string) : Promise<any>;
}
