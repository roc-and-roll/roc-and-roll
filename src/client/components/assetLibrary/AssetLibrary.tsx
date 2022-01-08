import React, { useEffect, useState } from "react";
import { assetRemove } from "../../../shared/actions";
import {
  entries,
  RRAsset,
  RRAssetImage,
  RRPlayerID,
} from "../../../shared/state";
import { isTabletopAudioAsset } from "../../../shared/tabletopAudio";
import { useConfirm } from "../../dialog-boxes";
import { assetUrl } from "../../files";
import { mapDeleteImmutably, mapSetImmutably } from "../../immutable-helpers";
import { useMyProps } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import { BlurHashImage } from "../blurHash/BlurHashImage";
import { GMArea } from "../GMArea";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

export const AssetLibrary = React.memo(function AssetLibrary() {
  const assets = useServerState((state) => state.assets);
  const players = useServerState((state) => state.players);
  const myself = useMyProps("isGM", "id");

  const [assetTypeFilter, setAssetTypeFilter] = useState<
    RRAsset["type"] | "all"
  >("all");

  const [imageTypeFilter, setImageTypeFilter] = useState<
    RRAssetImage["originalFunction"] | "all"
  >("all");

  const [playerFilter, setPlayerFilter] = useState<RRPlayerID | "all">(
    myself.id
  );

  useEffect(() => {
    if (!myself.isGM) {
      setPlayerFilter(myself.id);
    }
  }, [myself.isGM, myself.id]);

  const [playerNames, setPlayerNames] = useState<Map<RRPlayerID, string>>(
    () => new Map()
  );

  useEffect(() => {
    setPlayerNames((oldPlayerNames) => {
      const oldPlayerIds = oldPlayerNames.keys();
      const newPlayerIds = players.ids;

      let newPlayerNames = oldPlayerNames;
      for (const oldPlayerId of oldPlayerIds) {
        if (!newPlayerIds.includes(oldPlayerId)) {
          newPlayerNames = mapDeleteImmutably(newPlayerNames, oldPlayerId);
        }
      }

      entries(players).forEach((player) => {
        newPlayerNames = mapSetImmutably(
          newPlayerNames,
          player.id,
          player.name
        );
      });

      return newPlayerNames;
    });
  }, [players]);

  return (
    <>
      <h1>Asset Library</h1>
      <label>
        Type:{" "}
        <Select
          value={assetTypeFilter}
          onChange={(value) => setAssetTypeFilter(value)}
          options={[
            {
              value: "all",
              label: "all",
            },
            {
              value: "image",
              label: "images",
            },
            {
              value: "song",
              label: "music",
            },
            {
              value: "other",
              label: "other",
            },
          ]}
        />
      </label>
      {assetTypeFilter === "image" && (
        <label>
          Image Type:{" "}
          <Select
            value={imageTypeFilter}
            onChange={(value) => setImageTypeFilter(value)}
            options={[
              {
                value: "all",
                label: "all",
              },
              {
                value: "token",
                label: "token",
              },
              {
                value: "map",
                label: "map",
              },
              {
                value: "unknown",
                label: "other",
              },
            ]}
          />
        </label>
      )}
      {myself.isGM && (
        <GMArea>
          <label>
            Player:{" "}
            <Select
              value={playerFilter}
              onChange={(value) => setPlayerFilter(value)}
              options={[
                {
                  value: "all",
                  label: "all",
                },
                ...entries(players).map((player) => ({
                  value: player.id,
                  label: player.name,
                })),
              ]}
            />
          </label>
        </GMArea>
      )}
      <ul>
        {entries(assets)
          .filter(
            (asset) =>
              !isTabletopAudioAsset.safeParse(asset).success &&
              (assetTypeFilter === "all" || asset.type === assetTypeFilter) &&
              (imageTypeFilter === "all" ||
                asset.type !== "image" ||
                asset.originalFunction === imageTypeFilter) &&
              (playerFilter === "all" || asset.playerId === playerFilter)
          )
          .map((asset) => (
            <Asset key={asset.id} asset={asset} playerNames={playerNames} />
          ))}
      </ul>
    </>
  );
});

function Asset({
  asset,
  playerNames,
}: {
  asset: RRAsset;
  playerNames: Map<RRPlayerID, string>;
}) {
  const dispatch = useServerDispatch();
  const confirm = useConfirm();
  const download = () => window.open(assetUrl(asset), "_blank")?.focus();

  return (
    <li>
      {asset.type === "image" &&
        (() => {
          const MAX_HEIGHT = 100;
          const height = Math.min(asset.height, MAX_HEIGHT);

          return (
            <BlurHashImage
              image={asset}
              width={asset.width * (height / asset.height)}
              height={height}
              loading="lazy"
              style={{
                width: "auto",
                height: "auto",
                maxHeight: MAX_HEIGHT,
                cursor: "pointer",
              }}
              onClick={download}
            />
          );
        })()}
      <strong>
        <span className="ascii-art">{asset.type}</span> {asset.name}
      </strong>
      <br />
      Player: {asset.playerId ? playerNames.get(asset.playerId) : <em>none</em>}
      <br />
      <Button onClick={download}>download</Button>
      <Button
        className="red"
        onClick={async () => {
          if (
            await confirm(
              "Are you sure you want to delete this asset forever? Note that it might still be in use somewhere. Also note that the asset will currently not be deleted from the server."
            )
          ) {
            dispatch(assetRemove(asset.id));
          }
        }}
      >
        delete
      </Button>
      <hr />
    </li>
  );
}
