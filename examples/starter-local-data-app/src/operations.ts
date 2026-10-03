import { connectionCheck, getDataAppRegistration } from "@altertable/data-app/contract";

/** Connectivity probe only: its successful query supplies no analytical result. Replace it with
 * bounded, validated operations that cover the questions the finished app will answer. */
export const operations = { connection: connectionCheck() };

/** Same query and variable metadata submitted when publishing a hosted app. */
export const registration = getDataAppRegistration(operations);
