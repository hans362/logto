import { SmsConnectorInstance } from '@logto/connector-base-classes';
import {
  ConnectorError,
  ConnectorErrorCodes,
  SmsSendMessageByFunction,
  GetConnectorConfig,
} from '@logto/connector-types';
import { assert } from '@silverhand/essentials';
import { HTTPError } from 'got';

import { defaultMetadata } from './constant';
import { sendSms } from './single-send-text';
import { aliyunSmsConfigGuard, AliyunSmsConfig, sendSmsResponseGuard } from './types';

export default class AliyunSmsConnector<T> extends SmsConnectorInstance<AliyunSmsConfig, T> {
  constructor(getConnectorConfig: GetConnectorConfig) {
    super(getConnectorConfig);
    this.metadata = defaultMetadata;
    this.metadataParser();
  }

  public validateConfig(config: unknown): asserts config is AliyunSmsConfig {
    const result = aliyunSmsConfigGuard.safeParse(config);

    if (!result.success) {
      throw new ConnectorError(ConnectorErrorCodes.InvalidConfig, result.error);
    }
  }

  public readonly sendMessageBy: SmsSendMessageByFunction<AliyunSmsConfig> = async (
    config,
    phone,
    type,
    data
  ) => {
    const { accessKeyId, accessKeySecret, signName, templates } = config;
    const template = templates.find(({ usageType }) => usageType === type);

    assert(
      template,
      new ConnectorError(ConnectorErrorCodes.TemplateNotFound, `Cannot find template!`)
    );

    try {
      const httpResponse = await sendSms(
        {
          AccessKeyId: accessKeyId,
          PhoneNumbers: phone,
          SignName: signName,
          TemplateCode: template.templateCode,
          TemplateParam: JSON.stringify(data),
        },
        accessKeySecret
      );

      const { body: rawBody } = httpResponse;

      const { Code, Message, ...rest } = this.parseResponseString(rawBody);

      if (Code !== 'OK') {
        throw new ConnectorError(ConnectorErrorCodes.General, {
          errorDescription: Message,
          Code,
          ...rest,
        });
      }

      return httpResponse;
    } catch (error: unknown) {
      if (!(error instanceof HTTPError)) {
        throw error;
      }

      const {
        response: { body: rawBody },
      } = error;

      assert(typeof rawBody === 'string', new ConnectorError(ConnectorErrorCodes.InvalidResponse));

      const { Code, Message, ...rest } = this.parseResponseString(rawBody);

      throw new ConnectorError(ConnectorErrorCodes.General, {
        errorDescription: Message,
        Code,
        ...rest,
      });
    }
  };

  private readonly parseResponseString = (response: string) => {
    const result = sendSmsResponseGuard.safeParse(JSON.parse(response));

    if (!result.success) {
      throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error.message);
    }

    return result.data;
  };
}
