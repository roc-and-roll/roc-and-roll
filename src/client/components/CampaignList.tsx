import React, { useState, useEffect } from "react";
import { CampaignEntity } from "../../shared/campaign";
import { useChangeCampaign } from "../campaign";
import { usePrompt } from "../popup-boxes";

async function fetchCampaigns(abortController?: AbortController) {
  try {
    const result = await fetch(`/api/campaigns`, {
      method: "GET",
      signal: abortController?.signal,
    });

    if (!result.ok) {
      throw new Error();
    }

    return (await result.json()) as CampaignEntity[];
  } catch (err) {
    // TODO: Handle error
    return [];
  }
}

export const CampaignList = React.memo(function CampaignList() {
  const changeCampaign = useChangeCampaign();
  const [campaigns, setCampaigns] = useState<CampaignEntity[]>([]);
  const [fetching, setFetching] = useState(false);
  const prompt = usePrompt();

  useEffect(() => {
    const abortController = new AbortController();
    setFetching(true);

    void (async () => {
      setCampaigns(await fetchCampaigns(abortController));
      setFetching(false);
    })();

    return () => {
      abortController.abort();
      setFetching(false);
    };
  }, []);

  const createCampaign = async () => {
    setFetching(true);
    try {
      const name = (
        await prompt("Name of the campaign", "My Campaign")
      )?.trim();
      if (name === undefined || name.length === 0) {
        return;
      }

      const result = await fetch(`/api/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!result.ok) {
        throw new Error();
      }

      setCampaigns(await fetchCampaigns());
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="join-wrapper">
      <h1>Select a campaign to join</h1>
      <ul role="list">
        {campaigns.map((campaign) => (
          <li key={campaign.id} onClick={() => changeCampaign(campaign)}>
            {campaign.name}
          </li>
        ))}
        <li onClick={() => !fetching && createCampaign()}>
          {fetching ? "loading..." : "create new campaign"}
        </li>
      </ul>
    </div>
  );
});
