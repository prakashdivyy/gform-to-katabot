import { Component } from "merapi";
import { IGformManager } from "interfaces/managers";

export default class GformManager extends Component implements IGformManager {
    private phantom : any;

    constructor() {
        super();
        this.phantom = require("phantom");
    }

    public async parse(uri : string) : Promise<any> {
        const form = await this.resolveForm(uri);
        if (form) {
            return this.mappingForm(form);
        } else {
            return null;
        }
    }

    private async resolveForm(uri : string) {
        const instance = await this.phantom.create();
        const page = await instance.createPage();
        await page.open(uri);

        // tslint:disable-next-line:only-arrow-functions
        const data = await page.evaluate(function() {
            const x : any = window;
            return x.FB_PUBLIC_LOAD_DATA_;
        });
        await instance.exit();
        return data;
    }

    private mappingForm(data : any) {
        const formData = data[1];

        const title = formData[8];
        const description = formData[0];

        const listQuestion = formData[1];

        const result : any = [];

        listQuestion.forEach((e : any) => {
            result.push(this.parseForm(e));
        });

        return result;
    }

    private parseForm(q : any) : any {
        const qType = q[3];
        const answersObject = q.length === 5 ? q[4][0] : undefined;

        const required = answersObject ? Boolean(answersObject[2]) : undefined;

        let type : string;
        let question = q[1];
        let answers : any;
        let title : any;
        let description : any;
        let url : any;

        switch (qType) {
            case 0:
                type = "short_answer";
                break;
            case 1:
                type = "paragraph";
                break;
            case 2:
                type = "multiple_choice";
                answers = this.multipleChoiceParser(answersObject[1]);
                break;
            case 3:
                type = "dropdown";
                answers = this.multipleChoiceParser(answersObject[1]);
                break;
            case 4:
                type = "checkboxes";
                answers = this.multipleChoiceParser(answersObject[1]);
                break;
            case 5:
                type = "linear_scale";
                const minLabel = answersObject[3][0];
                const maxLabel = answersObject[3][1];
                const minValue = parseInt(answersObject[1][0], 10);
                const maxValue = parseInt(answersObject[1][answersObject[1].length - 1], 10);
                answers = {
                    minValue,
                    maxValue,
                    minLabel,
                    maxLabel
                };
                break;
            case 6:
                type = "label";
                question = undefined;
                title = q[1];
                description = q[2] ? q[2] : undefined;
                break;
            case 8:
                type = "section";
                question = undefined;
                title = q[1];
                description = q[2] ? q[2] : undefined;
                break;
            case 9:
                type = "date";
                break;
            case 10:
                type = "time";
                break;
            case 11:
                type = "image";
                question = undefined;
                title = q[1];
                break;
            case 12:
                type = "video";
                question = undefined;
                title = q[1];
                url = `https://www.youtube.com/watch?v=${q[6][3]}`;
                break;
            case 13:
                type = "file_upload";
                let allowedAll = false;
                let allowedType : any;
                const maxNumberFiles = answersObject[10][2];
                const maxFileSize = `${parseInt(answersObject[10][3], 10) / 1024 / 1024} MB`;
                if (answersObject[10][1].length === 1 && answersObject[10][1][0] === 0) {
                    allowedAll = true;
                } else {
                    const listAllowed = answersObject[10][1];
                    const result : any = [];
                    listAllowed.forEach((e : any) => {
                        result.push(this.fileUploadType(e));
                    });
                    allowedType = result;
                }
                answers = {
                    allowedAll,
                    allowedType,
                    maxNumberFiles,
                    maxFileSize
                };
                break;
        }

        return {
            type,
            question,
            answers,
            required,
            title,
            description,
            url
        };
    }

    private multipleChoiceParser(answers : any) {
        let otherAnswers : any;

        if (answers[answers.length - 1][4] === 1) {
            otherAnswers = true;
            answers.pop();
        }

        const listAnswers : any = [];
        answers.forEach((e : any) => {
            listAnswers.push(e[0]);
        });

        return {
            listAnswers,
            otherAnswers
        };
    }

    private fileUploadType(type : number) : string {
        switch (type) {
            case 1:
                return "document";
            case 2:
                return "presentation";
            case 3:
                return "spreadsheet";
            case 4:
                return "drawing";
            case 5:
                return "pdf";
            case 6:
                return "image";
            case 7:
                return "video";
            case 8:
                return "audio";
        }
    }
}
