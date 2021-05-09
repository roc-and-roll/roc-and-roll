import React, { useEffect, useState } from "react";
import { playerUpdateAddCharacterId, characterAdd } from "../../shared/actions";
import { entries, RRCharacter, RRCharacterID } from "../../shared/state";
import { generateRandomToken, tokenImageUrl } from "../files";
import { useServerDispatch, useServerState } from "../state";
import { useDrag } from "react-dnd";
import { useMyself } from "../myself";
import { GMArea } from "./GMArea";
import { Popover } from "./Popover";
import { GRID_SIZE } from "../../shared/constants";
import { Button } from "./ui/Button";
import { clamp, randomName } from "../../shared/util";
import { TokenEditor } from "./TokenEditor";

async function makeNewToken(): Promise<Parameters<typeof characterAdd>[0]> {
  return {
    auras: [],
    conditions: [],
    hp: 0,
    maxHP: 0,
    scale: 1,
    visibility: "everyone",
    isTemplate: false,
    name: await randomName(),
    image: await generateRandomToken(),
  };
}

export function TokenManager() {
  const myself = useMyself();
  const tokens = useServerState((s) => s.characters);
  const [selectedToken, setSelectedToken] = useState<RRCharacterID | null>(
    null
  );
  const [newTokenIds, setNewTokenIds] = useState<RRCharacterID[]>([]);

  const dispatch = useServerDispatch();

  const [isAddingToken, setIsAddingToken] = useState(false);

  const addToken = () => {
    setIsAddingToken(true);
    (async () => {
      const tokenAddAction = characterAdd(await makeNewToken());
      const newToken = tokenAddAction.payload;
      dispatch([
        tokenAddAction,
        playerUpdateAddCharacterId({
          id: myself.id,
          characterId: newToken.id,
        }),
      ]);
      setNewTokenIds((l) => [...l, newToken.id]);
      setSelectedToken(newToken.id);
    })().finally(() => setIsAddingToken(false));
  };

  const tokenPreview = (t: RRCharacter) => (
    <EditableTokenPreview
      token={t}
      key={t.id}
      wasJustCreated={newTokenIds.includes(t.id)}
      onNameFirstEdited={() =>
        setNewTokenIds((l) => l.filter((id) => id !== t.id))
      }
      isSelected={selectedToken === t.id}
      setSelectedToken={(t) => setSelectedToken(t?.id ?? null)}
    />
  );

  return (
    <>
      <Button onClick={addToken} disabled={isAddingToken}>
        Add Token
      </Button>

      <div className="token-list">
        {entries(tokens)
          .filter((t) => myself.characterIds.includes(t.id))
          .map(tokenPreview)}
      </div>
      {myself.isGM && (
        <GMArea>
          <h4>Tokens of other players</h4>
          <div className="token-list">
            {entries(tokens)
              .filter((t) => !myself.characterIds.includes(t.id))
              .map(tokenPreview)}
          </div>
        </GMArea>
      )}
    </>
  );
}

function EditableTokenPreview({
  token,
  isSelected,
  setSelectedToken,
  onNameFirstEdited,
  wasJustCreated,
}: {
  token: RRCharacter;
  isSelected: boolean;
  setSelectedToken: (t: RRCharacter | null) => void;
  onNameFirstEdited: () => void;
  wasJustCreated: boolean;
}) {
  const [, dragRef] = useDrag<RRCharacter, void, null>(() => ({
    type: "token",
    item: token,
  }));

  return (
    <Popover
      content={
        <TokenEditor
          token={token}
          wasJustCreated={wasJustCreated}
          onNameFirstEdited={onNameFirstEdited}
          onClose={() => setSelectedToken(null)}
        />
      }
      visible={!!isSelected}
      onClickOutside={() => setSelectedToken(null)}
      interactive
      placement="right"
    >
      <div
        ref={dragRef}
        className="token-preview"
        onClick={() => setSelectedToken(token)}
      >
        <p>{token.name}</p>
        <TokenPreview token={token} />
      </div>
    </Popover>
  );
}

export function TokenPreview({ token }: { token: RRCharacter }) {
  return (
    <div
      className="token-image"
      title={token.name}
      style={{
        backgroundImage: token.image
          ? `url(${tokenImageUrl(token.image, GRID_SIZE)})`
          : "none",
      }}
    />
  );
}

export function TokenStack({ tokens }: { tokens: RRCharacter[] }) {
  const [topIdx, setTopIdx] = useState(0);

  // Allow to click through all tokens
  const sortedTokens = [...tokens.slice(topIdx), ...tokens.slice(0, topIdx)];
  useEffect(() => {
    setTopIdx((old) => clamp(0, old, tokens.length - 1));
  }, [tokens.length]);

  return (
    <div
      className="token-stack"
      onClick={() =>
        setTopIdx((old) => (old === 0 ? tokens.length - 1 : old - 1))
      }
    >
      {sortedTokens.map((token, i) => (
        <div
          key={token.id}
          style={{
            left:
              tokens.length === 1
                ? 24 / 2 // center token if there is just one in the stack
                : i === 0
                ? 0 // avoid division by 0
                : i * (24 / (tokens.length - 1)),
          }}
        >
          <TokenPreview token={token} />
        </div>
      ))}
    </div>
  );
}
