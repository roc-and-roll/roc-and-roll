import React, { useCallback, useContext, useState } from "react";
import { Socket } from "socket.io-client";
import { CampaignEntity } from "../shared/campaign";
import io from "socket.io-client";
import { SOCKET_IO_PATH } from "../shared/constants";
import { socketIONamespaceForCampaign } from "../shared/util";
import { Internal_ServerStateProvider } from "./state";

type Context = { campaign: CampaignEntity; socket: Socket } | null;

const CampaignContext = React.createContext<
  [Context, (campaign: CampaignEntity | null) => void]
>([null, () => {}]);
CampaignContext.displayName = "CampaignContext";

export function CampaignAndServerStateProvider({
  children,
  forTestingInitialState,
}: {
  children?: React.ReactNode;
  forTestingInitialState?: Context;
}) {
  const [context, setContext] = useState<Context>(
    forTestingInitialState ?? null
  );

  const changeCampaign = useCallback((campaign: CampaignEntity | null) => {
    setContext((old) => {
      old?.socket.disconnect();

      if (campaign === null) {
        return null;
      }

      const socket = io(socketIONamespaceForCampaign(campaign.id), {
        path: SOCKET_IO_PATH,
        autoConnect: true,
      });

      return { campaign, socket };
    });
  }, []);

  return (
    <CampaignContext.Provider value={[context, changeCampaign]}>
      <Internal_ServerStateProvider>{children}</Internal_ServerStateProvider>
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const [context] = useContext(CampaignContext);
  return context?.campaign ?? null;
}

export function useCampaignSocket() {
  const [context] = useContext(CampaignContext);
  return context?.socket ?? null;
}

export function useChangeCampaign() {
  const [_, changeCampaign] = useContext(CampaignContext);
  return changeCampaign;
}
