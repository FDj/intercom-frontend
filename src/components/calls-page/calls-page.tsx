import styled from "@emotion/styled";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useGlobalState } from "../../global-state/context-provider";
import { useCallList } from "../../hooks/use-call-list";
import { useUrlParams } from "../../hooks/use-url-params";
import { JoinProduction } from "../landing-page/join-production";
import { UserSettingsButton } from "../landing-page/user-settings-button";
import { Modal } from "../modal/modal";
import { PageHeader } from "../page-layout/page-header";
import { useAudioCue } from "../production-line/use-audio-cue";
import { useGlobalHotkeys } from "../production-line/use-line-hotkeys";
import { UserSettings } from "../user-settings/user-settings";
import { ConfirmationModal } from "../verify-decision/confirmation-modal";
import { HeaderActions } from "./header-actions";
import { ProductionLines } from "./production-lines";
import { useCallsNavigation } from "./use-calls-navigation";
import { useGlobalMuteHotkey } from "./use-global-mute-hotkey";
import { usePreventPullToRefresh } from "./use-prevent-pull-to-refresh";
import { useSpeakerDetection } from "./use-speaker-detection";
import { useSendWSCallStateUpdate } from "./use-send-ws-callstate-update";
import { useInitiateProductionCall } from "../../hooks/use-initiate-production-call";
import { useFetchProductionList } from "../landing-page/use-fetch-production-list";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
`;

const CallsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 2rem;
  padding: 0 2rem 2rem 2rem;

  [data-intercom-embed] & {
    padding: 0;
    gap: 0;
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    box-sizing: border-box;
  }

  form {
    margin: 0;
  }
`;

export const CallsPage = () => {
  const [productionId, setProductionId] = useState<string | null>(null);
  const [addCallActive, setAddCallActive] = useState<boolean>(false);
  const [confirmExitModalOpen, setConfirmExitModalOpen] =
    useState<boolean>(false);
  const [isMasterInputMuted, setIsMasterInputMuted] = useState<boolean>(true);
  const [{ calls, selectedProductionId, websocket, devices, userSettings }, dispatch] =
    useGlobalState();
  const { initiateProductionCall } = useInitiateProductionCall({ dispatch });
  const kioskModeJoinedRef = useRef<boolean>(false);
  const {
    deregisterCall,
    registerCallList,
    sendCallsStateUpdate,
    resetLastSentCallsState,
  } = useCallList({
    websocket,
    globalMute: isMasterInputMuted,
    numberOfCalls: Object.values(calls).length,
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isSettingGlobalMute, setIsSettingGlobalMute] =
    useState<boolean>(false);

  const { productionId: paramProductionId, lineId: paramLineId } = useParams();

  const isEmpty = Object.values(calls).length === 0;
  const isSingleCall = Object.values(calls).length === 1;
  const isFirstConnection = isEmpty && paramProductionId && paramLineId;

  const navigate = useCallsNavigation({
    isEmpty: Object.values(calls).length === 0,
    paramProductionId,
    paramLineId,
  });

  // Check for kiosk mode and username from URL
  const { usernameFromUrl, isKioskParam, isDeclutterMode } = useUrlParams();
  const isKioskMode = isFirstConnection && isKioskParam;

  const isProgramOutputAdded = Object.entries(calls).some(
    ([, callState]) =>
      callState.joinProductionOptions?.lineUsedForProgramOutput &&
      !callState.joinProductionOptions.isProgramUser
  );

  const callActionHandlers = useRef<Record<string, Record<string, () => void>>>(
    {}
  );
  const callIndexMap = useRef<Record<number, string>>({});

  const { shouldReduceVolume } = useSpeakerDetection({
    isProgramOutputAdded,
    calls,
  });

  const customGlobalMute = useGlobalMuteHotkey({
    calls,
    initialHotkey: "p",
  });

  useEffect(() => {
    callIndexMap.current = {};
    Object.keys(calls).forEach((callId, i) => {
      callIndexMap.current[i + 1] = callId;
    });
  }, [calls]);

  usePreventPullToRefresh();

  useEffect(() => {
    if (selectedProductionId) {
      setProductionId(selectedProductionId);
    }
  }, [selectedProductionId]);

  useSendWSCallStateUpdate({
    isSettingGlobalMute,
    isEmpty,
    sendCallsStateUpdate,
  });

  useGlobalHotkeys({
    muteInput: setIsMasterInputMuted,
    isInputMuted: isMasterInputMuted,
    customKey: customGlobalMute,
  });

  const { playExitSound } = useAudioCue();

  const { productions } = useFetchProductionList({
    limit: "100",
    extended: "true",
  });

  // Auto-join in kiosk mode
  useEffect(() => {
    const username = usernameFromUrl || userSettings?.username;

    if (
      isKioskMode &&
      isEmpty &&
      paramProductionId &&
      paramLineId &&
      devices.input?.length &&
      devices.output?.length &&
      productions &&
      !kioskModeJoinedRef.current &&
      username
    ) {
      const production = productions.productions.find(
        (p) => p.productionId === paramProductionId
      );

      if (!production) return;

      const selectedLine = production.lines.find(
        (line) => line.id.toString() === paramLineId
      );

      if (!selectedLine) return;

      // Use first available devices
      const audioinput = devices.input[0]?.deviceId || "no-device";
      const audiooutput = devices.output[0]?.deviceId;

      if (!audioinput) return;

      // Clear any previous errors before joining
      dispatch({
        type: "ERROR",
        payload: { error: null },
      });

      const options = {
        productionId: paramProductionId,
        lineId: paramLineId,
        username,
        audioinput,
        lineUsedForProgramOutput: selectedLine.programOutputLine || false,
        isProgramUser: false,
        lineName: selectedLine.name,
        productionName: production.name,
      };

      // Mark that we've initiated the join to prevent duplicate calls
      kioskModeJoinedRef.current = true;

      initiateProductionCall({
        payload: {
          joinProductionOptions: options,
          audiooutput,
        },
        customGlobalMute,
      }).then((success) => {
        if (!success) {
          // If it failed, allow retry
          kioskModeJoinedRef.current = false;
        }
      });
    }
  }, [
    isKioskMode,
    isEmpty,
    paramProductionId,
    paramLineId,
    devices.input,
    devices.output,
    productions,
    usernameFromUrl,
    userSettings?.username,
    initiateProductionCall,
    customGlobalMute,
    dispatch,
  ]);

  const runExitAllCalls = async () => {
    setProductionId(null);
    playExitSound();
    navigate("/");
    if (!isEmpty) {
      Object.entries(calls).forEach(([callId]) => {
        if (callId) {
          dispatch({
            type: "REMOVE_CALL",
            payload: { id: callId },
          });
          deregisterCall(callId);
        }
      });
    }
  };

  return (
    <>
      {!isFirstConnection && !isDeclutterMode && (
        <UserSettingsButton onClick={() => setShowSettings(!showSettings)} />
      )}
      {!isDeclutterMode && (
        <PageHeader
          title={!isEmpty ? "Calls" : ""}
          hasNavigateToRoot
          onNavigateToRoot={() => {
            if (isEmpty) {
              runExitAllCalls();
            } else {
              setConfirmExitModalOpen(true);
            }
          }}
        >
          {confirmExitModalOpen && (
            <ConfirmationModal
              title="Confirm"
              description="Are you sure you want to leave all calls?"
              confirmationText="This will leave all calls and return to the home page."
              onCancel={() => setConfirmExitModalOpen(false)}
              onConfirm={runExitAllCalls}
            />
          )}

          {showSettings && (
            <Modal onClose={() => setShowSettings(false)}>
              <UserSettings
                buttonText="Save"
                needsConfirmation
                onSave={() => setShowSettings(false)}
              />
            </Modal>
          )}

          <HeaderActions
            setIsSettingGlobalMute={setIsSettingGlobalMute}
            isEmpty={isEmpty}
            isSingleCall={isSingleCall}
            isMasterInputMuted={isMasterInputMuted}
            setIsMasterInputMuted={setIsMasterInputMuted}
            addCallActive={addCallActive}
            setAddCallActive={setAddCallActive}
            callIndexMap={callIndexMap}
            callActionHandlers={callActionHandlers}
            sendCallsStateUpdate={sendCallsStateUpdate}
            resetLastSentCallsState={resetLastSentCallsState}
            isDeclutterMode={isDeclutterMode}
          />
        </PageHeader>
      )}
      <Container>
        {isEmpty && paramProductionId && paramLineId && !isKioskMode && (
          <JoinProduction
            preSelected={{
              preSelectedProductionId: paramProductionId,
              preSelectedLineId: paramLineId,
            }}
            customGlobalMute={customGlobalMute}
            updateUserSettings
            isFirstConnection={isFirstConnection || undefined}
          />
        )}
        <CallsContainer>
          {addCallActive && productionId && (
            <JoinProduction
              customGlobalMute={customGlobalMute}
              addAdditionalCallId={productionId}
              closeAddCallView={() => setAddCallActive(false)}
              className="calls-page"
            />
          )}
          <ProductionLines
            isSettingGlobalMute={isSettingGlobalMute}
            setAddCallActive={setAddCallActive}
            isMasterInputMuted={isMasterInputMuted}
            customGlobalMute={customGlobalMute}
            isSingleCall={isSingleCall}
            callActionHandlers={callActionHandlers}
            shouldReduceVolume={shouldReduceVolume}
            calls={calls}
            registerCallList={registerCallList}
            deregisterCall={deregisterCall}
            isDeclutterMode={isDeclutterMode}
          />
        </CallsContainer>
      </Container>
    </>
  );
};
