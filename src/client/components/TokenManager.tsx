import React, { useEffect, useRef, useState } from "react";
import { playerUpdate, tokenAdd, tokenUpdate } from "../../shared/actions";
import { RRToken } from "../../shared/state";
import { fileUrl, useFileUpload } from "../files";
import { entries, useServerDispatch, useServerState } from "../state";
import { useDrag } from "react-dnd";
import { useMyself } from "../myself";
import { GMArea } from "./GMArea";

export function TokenManager() {
  const myself = useMyself();
  const tokens = useServerState((s) => s.tokens);
  const [selectedToken, setSelectedToken] = useState<RRToken | null>(null);

  const dispatch = useServerDispatch();

  const defaultToken = (): Omit<RRToken, "id"> => ({
    auras: [],
    conditions: [],
    hp: 0,
    image: null,
    maxHP: 0,
    size: 1,
    visibility: "everyone",
    isTemplate: false,
    name: "unnamed",
  });

  const addToken = () => {
    const newToken = dispatch(tokenAdd(defaultToken())).payload;
    dispatch(
      playerUpdate({
        id: myself.id,
        changes: {
          tokenIds: [...myself.tokenIds, newToken.id],
        },
      })
    );
    setSelectedToken(newToken);
  };

  return (
    <div className="token-manager">
      <button onClick={addToken}>Add Token</button>
      {selectedToken && (
        <TokenEditor
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}
      <div className="token-list">
        {entries(tokens)
          .filter((t) => myself.tokenIds.includes(t.id))
          .map((t) => (
            <TokenPreview
              token={t}
              key={t.id}
              onSelect={() => setSelectedToken(t)}
            />
          ))}
      </div>
      {myself.isGM && (
        <GMArea>
          <h4>Tokens of other players</h4>
          <div className="token-list">
            {entries(tokens)
              .filter((t) => !myself.tokenIds.includes(t.id))
              .map((t) => (
                <TokenPreview
                  token={t}
                  key={t.id}
                  onSelect={() => setSelectedToken(t)}
                />
              ))}
          </div>
        </GMArea>
      )}
    </div>
  );
}

function TokenPreview({
  token,
  onSelect,
}: {
  token: RRToken;
  onSelect: () => void;
}) {
  const [, dragRef] = useDrag<RRToken, void, null>(() => ({
    type: "token",
    item: token,
  }));

  return (
    <div onClick={onSelect} ref={dragRef} className="token-preview">
      {token.name}
      <div
        className="token-image"
        style={{
          backgroundImage: token.image
            ? `url(${fileUrl(token.image)})`
            : "none",
        }}
      />
    </div>
  );
}

function TokenEditor({
  token,
  onClose,
}: {
  token: RRToken;
  onClose: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [isUploading, upload] = useFileUpload("upload-token");
  const [name, setName] = useState(token.name);

  const dispatch = useServerDispatch();

  useEffect(() => {
    setName(token.name);
    fileInput.current!.value = "";
    nameInput.current!.focus();
  }, [token]);

  useEffect(() => {
    if (name == "unnamed") nameInput.current!.select();
  }, [name]);

  const updateImage = async () => {
    const uploadedFiles = await upload(fileInput.current!.files);
    dispatch(
      tokenUpdate({ id: token.id, changes: { image: uploadedFiles[0]! } })
    );
    fileInput.current!.value = "";
  };

  const updateName = () => {
    dispatch(tokenUpdate({ id: token.id, changes: { name } }));
  };

  return (
    <div className="token-popup">
      <div className="token-popup-close" onClick={onClose}>
        ×
      </div>
      <input
        ref={nameInput}
        onKeyPress={(e) => e.key === "Enter" && updateName()}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="token-name"
      />

      <input
        disabled={isUploading}
        onChange={updateImage}
        type="file"
        ref={fileInput}
      />
    </div>
  );
}
