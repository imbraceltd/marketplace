import logger from '../server/logging/logger';
import mongoose from 'mongoose';
import axios from 'axios';
import { Response } from 'express';

export enum ErrorCode {
  invalid_credential = 'invalid_credential',

  missing_workflow = 'missing_workflow',
  missing_organization = 'missing_organization',
  missing_business_unit = 'missing_business_unit',
  missing_channel = 'missing_channel',
  missing_user = 'missing_user',
  missing_team = 'missing_team',
  missing_template = 'missing_template',
  missing_app_id = 'missing_app_id',
  required_paid_user = 'required_paid_user',
  missing_product_id = 'missing_product_id',
  exceed_max_instance = 'exceed_max_instance',
  missing_form_id = 'missing_form_id',
  missing_email = 'missing_email',

  missing_form_name = 'missing_form_name',
  missing_form_owner = 'missing_form_owner',
  template_form_not_found = 'template_form_not_found',

  team_not_found = 'team_not_found',

  missing_name = 'missing_name',
  missing_subject = 'missing_subject',
  missing_body = 'missing_body',

  phone_number_already_exists = 'phone_number_already_exists',
  email_already_exists = 'email_already_exists',

  board_exist = 'board_exist',

  invalid_request = 'invalid_request',
  not_found = 'not_found',
  app_not_found = 'app_not_found',
  any = '',

  email_opt_out_not_found = 'email_opt_out_not_found',
  captcha_failed = 'captcha_failed',
}
class _Error extends Error {
  code = 500 || 400 || 401;
  error_code = ErrorCode.any;
  constructor(
    message: string,
    code: number,
    error_code: ErrorCode = ErrorCode.any
  ) {
    super(message);
    this.code = code;
    this.error_code = error_code;
  }
}

export default _Error;

export const handleControllerError = (
  error: unknown
): { message: string; code: number; error_code?: ErrorCode } => {
  logger.error({
    message: error instanceof _Error ? error.message : `${error}`,
    stack: error instanceof _Error ? error.stack : `${error}`,
    code: error instanceof _Error ? error.code : 500,
  });
  if (error instanceof _Error) {
    return {
      message: error.message,
      code: error.code,
      error_code: error.error_code,
    };
  }

  return {
    message: 'Internal Server Error',
    code: 500,
    error_code: 'internal_server_error' as ErrorCode,
  };
};

export const handleServiceError = (error: unknown): _Error => {
  logger.info({ error });
  if (error instanceof _Error) return error;

  // Handle Axios error
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.message;

    return new _Error(message, error.response?.status || 500);
  }

  if (error instanceof mongoose.Error || error instanceof Error)
    return new _Error(error.message, 400);
  if (axios.isAxiosError(error))
    return new _Error(
      error.response?.data || error.message,
      error.response?.status || 500
    );
  // handle MongoDB error
  if (error instanceof mongoose.MongooseError) {
    if ('code' in error && error['code'] === 11000) {
      return new _Error(
        'Duplicate field value entered. Please enter another value.',
        400,
        ErrorCode.invalid_request
      );
    }

    if ('name' in error && error['name'] === 'ValidationError') {
      const errors = error as mongoose.Error.ValidationError;
      const message = Object.values(errors.errors)
        .map((val) => val.message)
        .join(', ');
      return new _Error(message, 400, ErrorCode.invalid_request);
    }
  }
  return new _Error(`${error}`, 500);
};

export const handleControllerErrorV2 = async (error: _Error, res: Response) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    code: error.code,
  });

  const code = error.code || 500;

  return res.status(code).json({
    message: error.message,
    error_code: error.error_code,
  });
};
