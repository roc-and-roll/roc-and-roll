import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState } from "react";
import { playerUpdate } from "../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import {
  categoryIcons,
  fixedCategoryIcons,
  iconMap,
  userCategoryIcons,
} from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch } from "../state";
import { DiceInput } from "./DiceInput";
import { DiceInterface } from "./DiceInterface";
import { DiceTemplates } from "./DiceTemplates";
import { Popover } from "./Popover";
import { Button } from "./ui/Button";
import { SmartTextInput } from "./ui/TextInput";

export const DicePanel = React.memo(function DicePanel() {
  const [active, setActive] = useState(0);
  const myself = useMyself();
  const dispatch = useServerDispatch();

  function addTemplateCategory() {
    dispatch({
      actions: [
        playerUpdate({
          id: myself.id,
          changes: {
            diceTemplateCategories: [
              ...myself.diceTemplateCategories,
              {
                //TODO we do not allow doubles anymore, pick first free icon
                icon: "book",
                categoryName: "",
              },
            ],
          },
        }),
      ],
      optimisticKey: "diceTemplateCategories",
      syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
    });
  }

  return (
    <div className="tabs">
      <div className="tab-buttons">
        {[
          {
            icon: "d20" as typeof categoryIcons[number],
            categoryName: "Input",
          },
          ...myself.diceTemplateCategories,
        ].map(
          (
            {
              icon,
              categoryName,
            }: { icon: typeof categoryIcons[number]; categoryName: string },
            index
          ) => (
            <DiceTemplateButton
              key={index}
              index={index}
              categoryName={categoryName}
              icon={icon}
              active={active === index}
              onSetActive={() => setActive(index)}
            />
          )
        )}
        <div
          className={"tab-button"}
          onClick={() => {
            addTemplateCategory();
          }}
          title="Add Category"
        >
          <FontAwesomeIcon icon={faPlus} fixedWidth />
        </div>
      </div>

      <div className={clsx("tab", active === 0 ? "active" : "")}>
        <DiceInterface />
        <DiceInput />
      </div>
      {myself.diceTemplateCategories.map((_category, index) => (
        <div
          key={index}
          className={clsx("tab", active === index + 1 ? "active" : "")}
        >
          <DiceTemplates categoryIndex={index} />
        </div>
      ))}
    </div>
  );
});

function DiceTemplateButton({
  index,
  categoryName,
  icon,
  active,
  onSetActive,
}: {
  index: number;
  categoryName: string;
  icon: typeof categoryIcons[number];
  active: boolean;
  onSetActive: () => void;
}) {
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  return (
    <Popover
      interactive
      onClickOutside={(_i, e) => setAddMenuVisible(false)}
      visible={addMenuVisible}
      placement="bottom"
      content={<DiceTemplateCategoryEditor index={index - 1} />}
    >
      <div
        className={clsx("tab-button", active ? "active" : "")}
        onClick={(e) => {
          e.stopPropagation();
          if (e.button === 0) onSetActive();
          else if (e.button === 2) {
            e.stopPropagation();
          }
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (
            fixedCategoryIcons.findIndex((fixedIcon) => fixedIcon === icon) > -1
          )
            return;
          setAddMenuVisible(true);
        }}
        title={categoryName}
      >
        <FontAwesomeIcon icon={iconMap[icon]} fixedWidth />
      </div>
    </Popover>
  );
}

function DiceTemplateCategoryEditor({ index }: { index: number }) {
  const myself = useMyself();
  const dispatch = useServerDispatch();

  function deleteCategory() {
    dispatch({
      actions: [
        playerUpdate({
          id: myself.id,
          changes: {
            diceTemplateCategories: myself.diceTemplateCategories.filter(
              (_c, i) => i !== index
            ),
          },
        }),
      ],
      optimisticKey: "diceTemplateCategories",
      syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
    });
  }

  function updateCategory(
    newIcon?: typeof categoryIcons[number],
    newName?: string
  ) {
    dispatch({
      actions: [
        playerUpdate({
          id: myself.id,
          changes: {
            diceTemplateCategories: myself.diceTemplateCategories.map(
              (
                {
                  categoryName,
                  icon,
                }: {
                  categoryName: string;
                  icon: typeof categoryIcons[number];
                },
                i: number
              ) => {
                if (index === i)
                  return {
                    icon: newIcon ?? icon,
                    categoryName: newName ?? categoryName,
                  };
                else return { icon, categoryName };
              }
            ),
          },
        }),
      ],
      optimisticKey: "diceTemplateCategories",
      syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
    });
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        console.log("test");
      }}
      style={{ width: "170px" }}
    >
      <SmartTextInput
        value={myself.diceTemplateCategories[index]!.categoryName}
        onChange={(name) => updateCategory(undefined, name)}
        style={{ marginBottom: "0.6rem" }}
      />
      <div>
        {userCategoryIcons.map((icon) => {
          const alreadyUsed =
            myself.diceTemplateCategories.findIndex(
              (category) => category.icon === icon
            ) >= 0;
          return (
            <FontAwesomeIcon
              key={icon}
              icon={iconMap[icon]}
              style={{
                fontSize: "24px",
                margin: "2px",
                color: alreadyUsed ? "grey" : "white",
              }}
              onClick={() => {
                if (alreadyUsed) return;
                updateCategory(icon);
              }}
              fixedWidth
            />
          );
        })}
      </div>
      <Button
        className="red"
        onClick={deleteCategory}
        style={{ marginTop: "12px" }}
      >
        Delete Category
      </Button>
    </div>
  );
}
