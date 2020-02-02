import * as consts from './consts';
declare const _default: {
    [consts.FRAMEWORK_ON_EVENT_HANDLER_NAME]: (event: any) => Promise<void>;
    [consts.FRAMEWORK_IS_COMPLETE_HANDLER_NAME]: (event: any) => Promise<void>;
    [consts.FRAMEWORK_ON_TIMEOUT_HANDLER_NAME]: typeof onTimeout;
};
export = _default;
declare function onTimeout(timeoutEvent: any): Promise<void>;
