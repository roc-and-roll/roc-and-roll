import React, { useEffect, useState } from "react";
import { assetImageUpdate, assetRemove } from "../../../shared/actions";
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
import { SmartTextInput } from "../ui/TextInput";
import { matchSorter } from "match-sorter";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faDownload,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useDrag } from "react-dnd";
import clsx from "clsx";
import { useAskForDPI } from "../../util";

const assetTypeOptions = [
  { value: "image", label: "Images" },
  { value: "song", label: "Songs" },
  { value: "other", label: "Other" },
] as const;

const imageTypeOptions = [
  { value: "map", label: "Map Objects" },
  { value: "token", label: "Tokens" },
  { value: "unknown", label: "Other" },
] as const;

export const AssetLibrary = React.memo(function AssetLibrary() {
  const assets = useServerState((state) => state.assets);
  const players = useServerState((state) => state.players);
  const myself = useMyProps("isGM", "id");

  const [assetTypeFilter, setAssetTypeFilter] = useState<
    RRAsset["type"] | "all"
  >("image");

  const [imageTypeFilter, setImageTypeFilter] = useState<
    RRAssetImage["originalFunction"] | "all"
  >("map");

  const [playerFilter, setPlayerFilter] = useState<RRPlayerID | "all">(
    myself.id
  );

  const [nameFilter, setNameFilter] = useState("");

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

  const filteredAssets = matchSorter(
    entries(assets).filter(
      (asset) =>
        !isTabletopAudioAsset.safeParse(asset).success &&
        (assetTypeFilter === "all" || asset.type === assetTypeFilter) &&
        (imageTypeFilter === "all" ||
          asset.type !== "image" ||
          asset.originalFunction === imageTypeFilter) &&
        (playerFilter === "all" || asset.playerId === playerFilter)
    ),
    nameFilter,
    {
      keys: ["name", "description", "tags.*"],
      threshold: matchSorter.rankings.ACRONYM,
    }
  );

  const dense = imageTypeFilter === "map" && assetTypeFilter === "image";

  return (
    <>
      <h1>Asset Library</h1>
      {myself.isGM && (
        <GMArea className="mb-2">
          <label>
            Filter by player:{" "}
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
      <Tabs
        value={assetTypeFilter}
        onChange={(value) => setAssetTypeFilter(value)}
        tabs={assetTypeOptions}
      />
      {assetTypeFilter === "image" && (
        <Tabs
          className="text-sm"
          value={imageTypeFilter}
          onChange={(value) => setImageTypeFilter(value)}
          tabs={imageTypeOptions}
        />
      )}
      <div className="-mx-3 mt-[1px]">
        <SmartTextInput
          className="px-3 py-1 bg-rr-100 placeholder-rr-500"
          value={nameFilter}
          onChange={setNameFilter}
          placeholder="filter assets"
          type="search"
        />
      </div>

      <ul
        className={clsx("-mx-3", {
          "grid grid-cols-3": dense,
        })}
      >
        {filteredAssets.map((asset) => (
          <Asset
            key={asset.id}
            asset={asset}
            playerNames={playerNames}
            dense={dense}
          />
        ))}
        {filteredAssets.length === 0 && (
          <li className="p-1 text-center italic">
            no assets found matching your filters
          </li>
        )}
      </ul>
    </>
  );
});

function Tabs<V extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: ReadonlyArray<{ label: string; value: V }>;
  value: V;
  onChange: (value: V) => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "-mx-3 px-3 flex bg-rr-600 border-b-2 border-rr-500",
        className
      )}
    >
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          unstyled
          className={clsx(
            "px-4 py-1 hover:bg-rr-500 border-r-2 border-rr-500 last:border-r-0",
            {
              "font-bold": tab.value === value,
            }
          )}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}

function Asset({
  asset,
  playerNames,
  dense,
}: {
  asset: RRAsset;
  playerNames: Map<RRPlayerID, string>;
  dense: boolean;
}) {
  const dispatch = useServerDispatch();
  const confirm = useConfirm();
  const onDownload = () => window.open(assetUrl(asset), "_blank")?.focus();
  const askForDPI = useAskForDPI();
  const onOpenSettings = async () => {
    if (asset.type !== "image") {
      return;
    }
    const dpi = await askForDPI(asset.dpi);
    if (dpi !== null) {
      dispatch(assetImageUpdate({ id: asset.id, changes: { dpi } }));
    }
  };

  return (
    <li className="flex flex-col px-3 py-2 border-b-2 border-rr-500">
      <span className="flex">
        <span
          className={clsx("flex-1 font-bold line-clamp-2", {
            "text-xs mb-1 line-clamp-2 break-words": dense,
            truncate: !dense,
          })}
          title={asset.name}
        >
          {asset.name}
        </span>
        {!dense && <span className="ml-2 font-mono">{asset.type}</span>}
      </span>
      <span
        className={clsx("flex", {
          "justify-end": !dense,
          "justify-center": dense,
        })}
      >
        {asset.type === "image" && <DraggableImagePreview asset={asset} />}
      </span>
      <span className="flex-1" />
      <span
        className={clsx("flex items-end text-xs", {
          " -mt-6": dense,
        })}
      >
        <span className="flex-1">
          {!dense && (
            <>
              ~{" "}
              {(asset.playerId && playerNames.get(asset.playerId)) ?? (
                <em>unknown</em>
              )}
            </>
          )}
          {asset.type === "image" && asset.dpi !== null && (
            <span>
              {" "}
              {Math.round(asset.width / asset.dpi)}×
              {Math.round(asset.height / asset.dpi)}
            </span>
          )}
        </span>

        {asset.type === "image" && (
          <Button
            unstyled
            className="ml-2"
            onClick={onOpenSettings}
            title="download"
          >
            <FontAwesomeIcon icon={faCog} />
          </Button>
        )}
        <Button unstyled className="ml-2" onClick={onDownload} title="download">
          <FontAwesomeIcon icon={faDownload} />
        </Button>
        <Button
          unstyled
          className="ml-2 text-red-500"
          title="delete"
          onClick={async () => {
            if (
              await confirm(
                "Are you sure you want to delete this asset forever? It might still be in use somewhere and might break when it is deleted. Note: assets will currently never be deleted from the server."
              )
            ) {
              dispatch(assetRemove(asset.id));
            }
          }}
        >
          <FontAwesomeIcon icon={faTrashAlt} />
        </Button>
      </span>
      {!dense && <span>{asset.tags.join(", ")}</span>}
    </li>
  );
}

function DraggableImagePreview({ asset }: { asset: RRAssetImage }) {
  const canDrag = asset.originalFunction === "map";

  const [_, dragRef] = useDrag(
    () => ({
      type: "asset/image",
      item: { imageAsset: asset },
      options: {
        dropEffect: "copy",
      },
      canDrag,
    }),
    [canDrag, asset]
  );

  const MAX_HEIGHT = 100;
  const height = Math.min(asset.height, MAX_HEIGHT);

  return (
    <BlurHashImage
      // Make sure to not set the ref when the image should not be draggable,
      // since otherwise the draggable attribute will automatically be set to
      // true, regardless of how we set it below.
      ref={canDrag ? dragRef : undefined}
      image={asset}
      width={asset.width * (height / asset.height)}
      height={height}
      loading="lazy"
      className={clsx("w-auto h-auto my-1", {
        "cursor-move": canDrag,
      })}
      draggable={canDrag}
      style={{
        maxHeight: MAX_HEIGHT,
      }}
    />
  );
}
