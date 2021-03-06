"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable: max-line-length
// tslint:disable: no-console
const url = require("url");
const outbound_1 = require("./outbound");
const util_1 = require("./util");
exports.CREATE_FAILED_PHYSICAL_ID_MARKER = 'AWSCDK::CustomResourceProviderFramework::CREATE_FAILED';
exports.MISSING_PHYSICAL_ID_MARKER = 'AWSCDK::CustomResourceProviderFramework::MISSING_PHYSICAL_ID';
async function submitResponse(status, event, options = {}) {
    const json = {
        Status: status,
        Reason: options.reason || status,
        StackId: event.StackId,
        RequestId: event.RequestId,
        PhysicalResourceId: event.PhysicalResourceId || exports.MISSING_PHYSICAL_ID_MARKER,
        LogicalResourceId: event.LogicalResourceId,
        NoEcho: options.noEcho,
        Data: event.Data
    };
    util_1.log('submit response to cloudformation', json);
    const responseBody = JSON.stringify(json);
    const parsedUrl = url.parse(event.ResponseURL);
    await outbound_1.httpRequest({
        hostname: parsedUrl.hostname,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'content-type': '',
            'content-length': responseBody.length
        }
    }, responseBody);
}
exports.submitResponse = submitResponse;
exports.includeStackTraces = true; // for unit tests
function safeHandler(block) {
    return async (event) => {
        // ignore DELETE event when the physical resource ID is the marker that
        // indicates that this DELETE is a subsequent DELETE to a failed CREATE
        // operation.
        if (event.RequestType === 'Delete' && event.PhysicalResourceId === exports.CREATE_FAILED_PHYSICAL_ID_MARKER) {
            util_1.log(`ignoring DELETE event caused by a failed CREATE event`);
            await submitResponse('SUCCESS', event);
            return;
        }
        try {
            await block(event);
        }
        catch (e) {
            // tell waiter state machine to retry
            if (e instanceof Retry) {
                util_1.log(`retry requested by handler`);
                throw e;
            }
            if (!event.PhysicalResourceId) {
                // special case: if CREATE fails, which usually implies, we usually don't
                // have a physical resource id. in this case, the subsequent DELETE
                // operation does not have any meaning, and will likely fail as well. to
                // address this, we use a marker so the provider framework can simply
                // ignore the subsequent DELETE.
                if (event.RequestType === 'Create') {
                    util_1.log(`CREATE failed, responding with a marker physical resource id so that the subsequent DELETE will be ignored`);
                    event.PhysicalResourceId = exports.CREATE_FAILED_PHYSICAL_ID_MARKER;
                }
                else {
                    // otherwise, if PhysicalResourceId is not specified, something is
                    // terribly wrong because all other events should have an ID.
                    util_1.log(`ERROR: Malformed event. "PhysicalResourceId" is required: ${JSON.stringify(event)}`);
                }
            }
            // this is an actual error, fail the activity altogether and exist.
            await submitResponse('FAILED', event, {
                reason: exports.includeStackTraces ? e.stack : e.message,
            });
        }
    };
}
exports.safeHandler = safeHandler;
class Retry extends Error {
}
exports.Retry = Retry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2ZuLXJlc3BvbnNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2ZuLXJlc3BvbnNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0NBQWtDO0FBQ2xDLDZCQUE2QjtBQUM3QiwyQkFBMkI7QUFDM0IseUNBQXlDO0FBQ3pDLGlDQUE2QjtBQUVoQixRQUFBLGdDQUFnQyxHQUFHLHdEQUF3RCxDQUFDO0FBQzVGLFFBQUEsMEJBQTBCLEdBQUcsOERBQThELENBQUM7QUFnQmxHLEtBQUssVUFBVSxjQUFjLENBQUMsTUFBNEIsRUFBRSxLQUFpQyxFQUFFLFVBQXlDLEVBQUc7SUFDaEosTUFBTSxJQUFJLEdBQW1EO1FBQzNELE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLElBQUksTUFBTTtRQUNoQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87UUFDdEIsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1FBQzFCLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxrQkFBa0IsSUFBSSxrQ0FBMEI7UUFDMUUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLGlCQUFpQjtRQUMxQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07UUFDdEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO0tBQ2pCLENBQUM7SUFFRixVQUFHLENBQUMsbUNBQW1DLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFL0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUUxQyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMvQyxNQUFNLHNCQUFXLENBQUM7UUFDaEIsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRO1FBQzVCLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSTtRQUNwQixNQUFNLEVBQUUsS0FBSztRQUNiLE9BQU8sRUFBRTtZQUNQLGNBQWMsRUFBRSxFQUFFO1lBQ2xCLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxNQUFNO1NBQ3RDO0tBQ0YsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNuQixDQUFDO0FBMUJELHdDQTBCQztBQUVVLFFBQUEsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLENBQUMsaUJBQWlCO0FBRXZELFNBQWdCLFdBQVcsQ0FBQyxLQUFvQztJQUM5RCxPQUFPLEtBQUssRUFBRSxLQUFVLEVBQUUsRUFBRTtRQUUxQix1RUFBdUU7UUFDdkUsdUVBQXVFO1FBQ3ZFLGFBQWE7UUFDYixJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsS0FBSyx3Q0FBZ0MsRUFBRTtZQUNuRyxVQUFHLENBQUMsdURBQXVELENBQUMsQ0FBQztZQUM3RCxNQUFNLGNBQWMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkMsT0FBTztTQUNSO1FBRUQsSUFBSTtZQUNGLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3BCO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixxQ0FBcUM7WUFDckMsSUFBSSxDQUFDLFlBQVksS0FBSyxFQUFFO2dCQUN0QixVQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztnQkFDbEMsTUFBTSxDQUFDLENBQUM7YUFDVDtZQUVELElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUU7Z0JBQzdCLHlFQUF5RTtnQkFDekUsbUVBQW1FO2dCQUNuRSx3RUFBd0U7Z0JBQ3hFLHFFQUFxRTtnQkFDckUsZ0NBQWdDO2dCQUNoQyxJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFO29CQUNsQyxVQUFHLENBQUMsNEdBQTRHLENBQUMsQ0FBQztvQkFDbEgsS0FBSyxDQUFDLGtCQUFrQixHQUFHLHdDQUFnQyxDQUFDO2lCQUM3RDtxQkFBTTtvQkFDTCxrRUFBa0U7b0JBQ2xFLDZEQUE2RDtvQkFDN0QsVUFBRyxDQUFDLDZEQUE2RCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDM0Y7YUFDRjtZQUVELG1FQUFtRTtZQUNuRSxNQUFNLGNBQWMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFO2dCQUNwQyxNQUFNLEVBQUUsMEJBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPO2FBQ2pELENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTNDRCxrQ0EyQ0M7QUFFRCxNQUFhLEtBQU0sU0FBUSxLQUFLO0NBQUk7QUFBcEMsc0JBQW9DIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCAqIGFzIHVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHsgaHR0cFJlcXVlc3QgfSBmcm9tICcuL291dGJvdW5kJztcbmltcG9ydCB7IGxvZyB9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBjb25zdCBDUkVBVEVfRkFJTEVEX1BIWVNJQ0FMX0lEX01BUktFUiA9ICdBV1NDREs6OkN1c3RvbVJlc291cmNlUHJvdmlkZXJGcmFtZXdvcms6OkNSRUFURV9GQUlMRUQnO1xuZXhwb3J0IGNvbnN0IE1JU1NJTkdfUEhZU0lDQUxfSURfTUFSS0VSID0gJ0FXU0NESzo6Q3VzdG9tUmVzb3VyY2VQcm92aWRlckZyYW1ld29yazo6TUlTU0lOR19QSFlTSUNBTF9JRCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xvdWRGb3JtYXRpb25SZXNwb25zZU9wdGlvbnMge1xuICByZWFkb25seSByZWFzb24/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IG5vRWNobz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xvdWRGb3JtYXRpb25FdmVudENvbnRleHQge1xuICBTdGFja0lkOiBzdHJpbmc7XG4gIFJlcXVlc3RJZDogc3RyaW5nO1xuICBQaHlzaWNhbFJlc291cmNlSWQ/OiBzdHJpbmc7XG4gIExvZ2ljYWxSZXNvdXJjZUlkOiBzdHJpbmc7XG4gIFJlc3BvbnNlVVJMOiBzdHJpbmc7XG4gIERhdGE/OiBhbnlcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN1Ym1pdFJlc3BvbnNlKHN0YXR1czogJ1NVQ0NFU1MnIHwgJ0ZBSUxFRCcsIGV2ZW50OiBDbG91ZEZvcm1hdGlvbkV2ZW50Q29udGV4dCwgb3B0aW9uczogQ2xvdWRGb3JtYXRpb25SZXNwb25zZU9wdGlvbnMgPSB7IH0pIHtcbiAgY29uc3QganNvbjogQVdTTGFtYmRhLkNsb3VkRm9ybWF0aW9uQ3VzdG9tUmVzb3VyY2VSZXNwb25zZSA9IHtcbiAgICBTdGF0dXM6IHN0YXR1cyxcbiAgICBSZWFzb246IG9wdGlvbnMucmVhc29uIHx8IHN0YXR1cyxcbiAgICBTdGFja0lkOiBldmVudC5TdGFja0lkLFxuICAgIFJlcXVlc3RJZDogZXZlbnQuUmVxdWVzdElkLFxuICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogZXZlbnQuUGh5c2ljYWxSZXNvdXJjZUlkIHx8IE1JU1NJTkdfUEhZU0lDQUxfSURfTUFSS0VSLFxuICAgIExvZ2ljYWxSZXNvdXJjZUlkOiBldmVudC5Mb2dpY2FsUmVzb3VyY2VJZCxcbiAgICBOb0VjaG86IG9wdGlvbnMubm9FY2hvLFxuICAgIERhdGE6IGV2ZW50LkRhdGFcbiAgfTtcblxuICBsb2coJ3N1Ym1pdCByZXNwb25zZSB0byBjbG91ZGZvcm1hdGlvbicsIGpzb24pO1xuXG4gIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04uc3RyaW5naWZ5KGpzb24pO1xuXG4gIGNvbnN0IHBhcnNlZFVybCA9IHVybC5wYXJzZShldmVudC5SZXNwb25zZVVSTCk7XG4gIGF3YWl0IGh0dHBSZXF1ZXN0KHtcbiAgICBob3N0bmFtZTogcGFyc2VkVXJsLmhvc3RuYW1lLFxuICAgIHBhdGg6IHBhcnNlZFVybC5wYXRoLFxuICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgaGVhZGVyczoge1xuICAgICAgJ2NvbnRlbnQtdHlwZSc6ICcnLFxuICAgICAgJ2NvbnRlbnQtbGVuZ3RoJzogcmVzcG9uc2VCb2R5Lmxlbmd0aFxuICAgIH1cbiAgfSwgcmVzcG9uc2VCb2R5KTtcbn1cblxuZXhwb3J0IGxldCBpbmNsdWRlU3RhY2tUcmFjZXMgPSB0cnVlOyAvLyBmb3IgdW5pdCB0ZXN0c1xuXG5leHBvcnQgZnVuY3Rpb24gc2FmZUhhbmRsZXIoYmxvY2s6IChldmVudDogYW55KSA9PiBQcm9taXNlPHZvaWQ+KSB7XG4gIHJldHVybiBhc3luYyAoZXZlbnQ6IGFueSkgPT4ge1xuXG4gICAgLy8gaWdub3JlIERFTEVURSBldmVudCB3aGVuIHRoZSBwaHlzaWNhbCByZXNvdXJjZSBJRCBpcyB0aGUgbWFya2VyIHRoYXRcbiAgICAvLyBpbmRpY2F0ZXMgdGhhdCB0aGlzIERFTEVURSBpcyBhIHN1YnNlcXVlbnQgREVMRVRFIHRvIGEgZmFpbGVkIENSRUFURVxuICAgIC8vIG9wZXJhdGlvbi5cbiAgICBpZiAoZXZlbnQuUmVxdWVzdFR5cGUgPT09ICdEZWxldGUnICYmIGV2ZW50LlBoeXNpY2FsUmVzb3VyY2VJZCA9PT0gQ1JFQVRFX0ZBSUxFRF9QSFlTSUNBTF9JRF9NQVJLRVIpIHtcbiAgICAgIGxvZyhgaWdub3JpbmcgREVMRVRFIGV2ZW50IGNhdXNlZCBieSBhIGZhaWxlZCBDUkVBVEUgZXZlbnRgKTtcbiAgICAgIGF3YWl0IHN1Ym1pdFJlc3BvbnNlKCdTVUNDRVNTJywgZXZlbnQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBibG9jayhldmVudCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gdGVsbCB3YWl0ZXIgc3RhdGUgbWFjaGluZSB0byByZXRyeVxuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBSZXRyeSkge1xuICAgICAgICBsb2coYHJldHJ5IHJlcXVlc3RlZCBieSBoYW5kbGVyYCk7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG5cbiAgICAgIGlmICghZXZlbnQuUGh5c2ljYWxSZXNvdXJjZUlkKSB7XG4gICAgICAgIC8vIHNwZWNpYWwgY2FzZTogaWYgQ1JFQVRFIGZhaWxzLCB3aGljaCB1c3VhbGx5IGltcGxpZXMsIHdlIHVzdWFsbHkgZG9uJ3RcbiAgICAgICAgLy8gaGF2ZSBhIHBoeXNpY2FsIHJlc291cmNlIGlkLiBpbiB0aGlzIGNhc2UsIHRoZSBzdWJzZXF1ZW50IERFTEVURVxuICAgICAgICAvLyBvcGVyYXRpb24gZG9lcyBub3QgaGF2ZSBhbnkgbWVhbmluZywgYW5kIHdpbGwgbGlrZWx5IGZhaWwgYXMgd2VsbC4gdG9cbiAgICAgICAgLy8gYWRkcmVzcyB0aGlzLCB3ZSB1c2UgYSBtYXJrZXIgc28gdGhlIHByb3ZpZGVyIGZyYW1ld29yayBjYW4gc2ltcGx5XG4gICAgICAgIC8vIGlnbm9yZSB0aGUgc3Vic2VxdWVudCBERUxFVEUuXG4gICAgICAgIGlmIChldmVudC5SZXF1ZXN0VHlwZSA9PT0gJ0NyZWF0ZScpIHtcbiAgICAgICAgICBsb2coYENSRUFURSBmYWlsZWQsIHJlc3BvbmRpbmcgd2l0aCBhIG1hcmtlciBwaHlzaWNhbCByZXNvdXJjZSBpZCBzbyB0aGF0IHRoZSBzdWJzZXF1ZW50IERFTEVURSB3aWxsIGJlIGlnbm9yZWRgKTtcbiAgICAgICAgICBldmVudC5QaHlzaWNhbFJlc291cmNlSWQgPSBDUkVBVEVfRkFJTEVEX1BIWVNJQ0FMX0lEX01BUktFUjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIFBoeXNpY2FsUmVzb3VyY2VJZCBpcyBub3Qgc3BlY2lmaWVkLCBzb21ldGhpbmcgaXNcbiAgICAgICAgICAvLyB0ZXJyaWJseSB3cm9uZyBiZWNhdXNlIGFsbCBvdGhlciBldmVudHMgc2hvdWxkIGhhdmUgYW4gSUQuXG4gICAgICAgICAgbG9nKGBFUlJPUjogTWFsZm9ybWVkIGV2ZW50LiBcIlBoeXNpY2FsUmVzb3VyY2VJZFwiIGlzIHJlcXVpcmVkOiAke0pTT04uc3RyaW5naWZ5KGV2ZW50KX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyB0aGlzIGlzIGFuIGFjdHVhbCBlcnJvciwgZmFpbCB0aGUgYWN0aXZpdHkgYWx0b2dldGhlciBhbmQgZXhpc3QuXG4gICAgICBhd2FpdCBzdWJtaXRSZXNwb25zZSgnRkFJTEVEJywgZXZlbnQsIHtcbiAgICAgICAgcmVhc29uOiBpbmNsdWRlU3RhY2tUcmFjZXMgPyBlLnN0YWNrIDogZS5tZXNzYWdlLFxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgUmV0cnkgZXh0ZW5kcyBFcnJvciB7IH1cbiJdfQ==