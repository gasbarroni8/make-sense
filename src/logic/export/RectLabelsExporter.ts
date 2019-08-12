import {ExportFormatType} from "../../data/ExportFormatType";
import {ImageData, LabelRect} from "../../store/editor/types";
import {ImageRepository} from "../imageRepository/ImageRepository";
import {store} from "../..";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import moment from 'moment';

export class RectLabelsExporter {
    public static export(exportFormatType: ExportFormatType): void {
        switch (exportFormatType) {
            case ExportFormatType.YOLO:
                RectLabelsExporter.exportAsYOLO();
                break;
            case ExportFormatType.VOC:
                RectLabelsExporter.exportAsVOC();
                break;
            case ExportFormatType.CSV:
                RectLabelsExporter.exportAsCSV();
                break;
            default:
                return;
        }
    }

    private static exportAsYOLO(): void {
        let zip = new JSZip();
        store.getState().editor.imagesData.forEach((imageData: ImageData) => {
            const fileContent: string = RectLabelsExporter.wrapRectLabelsIntoYOLO(imageData);
            if (fileContent) {
                const fileName : string = imageData.fileData.name.replace(/\.[^/.]+$/, ".txt");
                zip.file(fileName, fileContent);
            }
        });

        const projectName: string = store.getState().editor.projectName
            .toLowerCase()
            .replace(' ', '-');

        const date: string = moment().format('YYYYMMDDhhmmss');
        zip.generateAsync({type:"blob"})
            .then(function(content) {
                saveAs(content, "labels_" + projectName + '_' + date + ".zip");
            });
    }

    private static wrapRectLabelsIntoYOLO(imageData: ImageData): string {
        if (imageData.labelRects.length === 0 || !imageData.loadStatus)
            return null;

        const image: HTMLImageElement = ImageRepository.getById(imageData.id);
        const labelRectsString: string[] = imageData.labelRects.map((labelRect: LabelRect) => {
            const labelFields = [
                labelRect.labelIndex + "",
                ((labelRect.rect.x + labelRect.rect.width / 2) / image.width).toFixed(6) + "",
                ((labelRect.rect.y + labelRect.rect.height / 2) / image.height).toFixed(6) + "",
                (labelRect.rect.width / image.width).toFixed(6) + "",
                (labelRect.rect.height / image.height).toFixed(6) + ""
            ];
            return labelFields.join(" ")
        });
        return labelRectsString.join("\n");
    }

    private static exportAsVOC(): void {
        let zip = new JSZip();
        store.getState().editor.imagesData.forEach((imageData: ImageData) => {
            const fileContent: string = RectLabelsExporter.wrapImageIntoVOC(imageData);
            if (fileContent) {
                const fileName : string = imageData.fileData.name.replace(/\.[^/.]+$/, ".xml");
                zip.file(fileName, fileContent);
            }
        });

        const projectName: string = store.getState().editor.projectName
            .toLowerCase()
            .replace(' ', '-');

        const date: string = moment().format('YYYYMMDDhhmmss');
        zip.generateAsync({type:"blob"})
            .then(function(content) {
                saveAs(content, "labels_" + projectName + '_' + date + ".zip");
            });
    }

    private static wrapRectLabelsIntoVOC(imageData: ImageData): string {
        if (imageData.labelRects.length === 0 || !imageData.loadStatus)
            return null;

        const labelNamesList: string[] = store.getState().editor.labelNames;
        const labelRectsString: string[] = imageData.labelRects.map((labelRect: LabelRect) => {
            const labelFields = [
                "\t<object>",
                "\t\t<name>" + labelNamesList[labelRect.labelIndex] + "</name>",
                "\t\t<pose>Unspecified</pose>",
                "\t\t<truncated>Unspecified</truncated>",
                "\t\t<difficult>Unspecified</difficult>",
                "\t\t<bndbox>",
                "\t\t\t<xmin>" + Math.round(labelRect.rect.x) + "</xmin>",
                "\t\t\t<ymin>" + Math.round(labelRect.rect.y) + "</ymin>",
                "\t\t\t<xmax>" + Math.round(labelRect.rect.x + labelRect.rect.width) + "</xmax>",
                "\t\t\t<ymax>" + Math.round(labelRect.rect.y + labelRect.rect.height) + "</ymax>",
                "\t\t</bndbox>",
                "\t</object>"
            ];
            return labelFields.join("\n")
        });
        return labelRectsString.join("\n");
    }

    private static wrapImageIntoVOC(imageData: ImageData): string {
        const labels: string = RectLabelsExporter.wrapRectLabelsIntoVOC(imageData);
        const projectName: string = store.getState().editor.projectName
            .toLowerCase()
            .replace(' ', '-');

        if (labels) {
            const image: HTMLImageElement = ImageRepository.getById(imageData.id);
            return [
                "<annotation>",
                "\t<folder>" + projectName + "</folder>",
                "\t<filename>" + imageData.fileData.name + "</filename>",
                "\t<path>" + "/" + projectName + "/" + imageData.fileData.name + "</path>",
                "\t<source>",
                "\t\t<database>Unspecified</database>",
                "\t</source>",
                "\t<size>",
                "\t\t<width>" + image.width + "</width>",
                "\t\t<height>" + image.height + "</height>",
                "\t\t<depth>3</depth>",
                "\t</size>",
                labels,
                "</annotation>"
            ].join("\n");
        }
        return null;
    }


    private static exportAsCSV(): void {
        const content: string = store.getState().editor.imagesData
            .map((imageData: ImageData) => {
                return RectLabelsExporter.wrapRectLabelsIntoCSV(imageData)})
            .filter((imageLabelData: string) => {
                return !!imageLabelData})
            .join("\n");

        const projectName: string = store.getState().editor.projectName
            .toLowerCase()
            .replace(' ', '-');

        const date: string = moment().format('YYYYMMDDhhmmss');
        const blob = new Blob([content], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "labels_" + projectName + "_" + date + ".csv");
    }

    private static wrapRectLabelsIntoCSV(imageData: ImageData): string {
        if (imageData.labelRects.length === 0 || !imageData.loadStatus)
            return null;

        const image: HTMLImageElement = ImageRepository.getById(imageData.id);
        const labelNamesList: string[] = store.getState().editor.labelNames;
        const labelRectsString: string[] = imageData.labelRects.map((labelRect: LabelRect) => {
            const labelFields = [
                labelNamesList[labelRect.labelIndex],
                Math.round(labelRect.rect.x) + "",
                Math.round(labelRect.rect.y) + "",
                Math.round(labelRect.rect.width) + "",
                Math.round(labelRect.rect.height) + "",
                imageData.fileData.name,
                image.width + "",
                image.height + ""
            ];
            return labelFields.join(",")
        });
        return labelRectsString.join("\n");
    }
}