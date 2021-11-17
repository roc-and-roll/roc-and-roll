import {
  faDiceD20,
  faHandPaper,
  faPlus,
  faShieldAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState, useEffect, useMemo } from "react";
import {
  playerAddDiceTemplateCategory,
  playerUpdateDiceTemplateCategory,
  playerDeleteDiceTemplateCategory,
} from "../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import {
  categoryIcons,
  characterStatNames,
  fixedCategoryIcons,
  iconMap,
  RRCharacter,
  RRDiceTemplateCategoryID,
  RRDiceTemplatePart,
  RRDiceTemplatePartDice,
  skillMap,
  skillNames,
  userCategoryIcons,
} from "../../shared/state";
import { rrid } from "../../shared/util";
import {
  RRDiceTemplate,
  RRDiceTemplateCategory,
} from "../../shared/validation";
import { useConfirm } from "../dialog-boxes";
import { useMyProps } from "../myself";
import { useServerDispatch, useServerState } from "../state";
import { DiceInput } from "./DiceInput";
import { DiceInterface } from "./DiceInterface";
import { DiceTemplates, GeneratedDiceTemplates } from "./DiceTemplates";
import { Popover } from "./Popover";
import { Button } from "./ui/Button";
import { SmartTextInput } from "./ui/TextInput";

export const DicePanel = React.memo(function DicePanel() {
  const [active, setActive] = useState<
    "Input" | "Skills" | "STs" | RRDiceTemplateCategoryID
  >("Input");
  const myself = useMyProps("diceTemplateCategories", "id", "mainCharacterId");
  const dispatch = useServerDispatch();

  useEffect(() => {
    if (
      active !== "Skills" &&
      active !== "STs" &&
      myself.diceTemplateCategories.find((cat) => cat.id === active) ===
        undefined
    ) {
      setActive("Input");
    }
  }, [myself.diceTemplateCategories, active]);

  function addTemplateCategory() {
    const freeIcon = userCategoryIcons.find((userIcon) => {
      return !myself.diceTemplateCategories
        .map(({ icon }: { icon: typeof categoryIcons[number] }) => icon)
        .includes(userIcon);
    });

    if (!freeIcon) return;

    dispatch({
      actions: [
        playerAddDiceTemplateCategory({
          id: myself.id,
          category: {
            id: rrid<RRDiceTemplateCategory>(),
            icon: freeIcon,
            categoryName: "",
            templates: [],
          },
        }),
      ],
      optimisticKey: "diceTemplateCategories",
      syncToServerThrottle: 0,
    });
  }

  function createD20Part(): RRDiceTemplatePartDice {
    return {
      id: rrid<RRDiceTemplatePart>(),
      type: "dice",
      faces: 20,
      count: 1,
      negated: false,
      modified: "none",
      damage: { type: null },
    };
  }
  const character: RRCharacter | null = useServerState((state) =>
    myself.mainCharacterId
      ? state.characters.entities[myself.mainCharacterId] ?? null
      : null
  );

  const isCharacterNull = character === null;
  const savingThrowTemplates = useMemo(
    () =>
      characterStatNames.map((statName: typeof characterStatNames[number]) => {
        const proficiency = isCharacterNull
          ? 0
          : character.savingThrows[statName] ?? 0;

        const parts: RRDiceTemplatePart[] = [
          createD20Part(),
          {
            id: rrid<RRDiceTemplatePart>(),
            type: "linkedStat",
            name: statName,
            damage: { type: null },
          },
        ];

        if (proficiency !== 0)
          parts.push({
            id: rrid<RRDiceTemplatePart>(),
            type: "linkedProficiency",
            damage: { type: null },
            proficiency,
          });

        return {
          id: rrid<RRDiceTemplate>(),
          name: `${statName} Saving Throw`,
          notes: "",
          parts,
          rollType: null,
        };
      }),
    [isCharacterNull, character?.savingThrows]
  );

  const skillTemplates = useMemo(
    () =>
      skillNames.map((skill) => {
        const proficiency = isCharacterNull ? 0 : character.skills[skill] ?? 0;
        const parts: RRDiceTemplatePart[] = [
          createD20Part(),
          {
            id: rrid<RRDiceTemplatePart>(),
            type: "linkedStat",
            name: skillMap[skill],
            damage: { type: null },
          },
        ];
        if (proficiency !== 0)
          parts.push({
            id: rrid<RRDiceTemplatePart>(),
            type: "linkedProficiency",
            damage: { type: null },
            proficiency,
          });

        return {
          id: rrid<RRDiceTemplate>(),
          name: skill,
          notes: "",
          parts,
          rollType: null,
        };
      }),
    [isCharacterNull, character?.skills]
  );

  function renderContent(active: string) {
    const category = myself.diceTemplateCategories.find(
      (cat) => cat.id === active
    );
    if (active !== "Skills" && active !== "STs" && category === undefined)
      active = "Input";
    switch (active) {
      case "Input":
        return (
          <>
            <DiceInterface />
            <DiceInput />
          </>
        );
      case "Skills":
        return <GeneratedDiceTemplates templates={skillTemplates} />;
      case "STs":
        return <GeneratedDiceTemplates templates={savingThrowTemplates} />;
      default:
        return <DiceTemplates category={category!} />;
    }
  }

  return (
    <div className="tabs">
      <div className="tab-buttons">
        <div
          className={clsx("tab-button", active === "Input" ? "active" : "")}
          onClick={() => setActive("Input")}
        >
          <FontAwesomeIcon icon={faDiceD20} name={"Input"} />
        </div>
        <div
          className={clsx("tab-button", active === "STs" ? "active" : "")}
          onClick={() => setActive("STs")}
        >
          <FontAwesomeIcon icon={faShieldAlt} name={"Saving Throws"} />
        </div>
        <div
          className={clsx("tab-button", active === "Skills" ? "active" : "")}
          onClick={() => setActive("Skills")}
        >
          <FontAwesomeIcon icon={faHandPaper} name={"Skills"} />
        </div>
        {myself.diceTemplateCategories.map((category) => (
          <DiceTemplateButton
            key={category.id}
            category={category}
            active={active === category.id}
            onSetActive={() => setActive(category.id)}
          />
        ))}
        {myself.diceTemplateCategories.length < userCategoryIcons.length && (
          <div
            className={"tab-button"}
            onClick={() => {
              addTemplateCategory();
            }}
            title="Add Category"
          >
            <FontAwesomeIcon icon={faPlus} fixedWidth />
          </div>
        )}
      </div>

      {renderContent(active)}
    </div>
  );
});

function DiceTemplateButton({
  category,
  active,
  onSetActive,
}: {
  category: RRDiceTemplateCategory;
  active: boolean;
  onSetActive: () => void;
}) {
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  return (
    <Popover
      interactive
      onClickOutside={() => setAddMenuVisible(false)}
      visible={addMenuVisible}
      placement="bottom"
      content={<DiceTemplateCategoryEditor category={category} />}
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
            fixedCategoryIcons.findIndex(
              (fixedIcon) => fixedIcon === category.icon
            ) > -1
          )
            return;
          setAddMenuVisible(true);
        }}
        title={category.categoryName}
      >
        <FontAwesomeIcon icon={iconMap[category.icon]} fixedWidth />
      </div>
    </Popover>
  );
}

function DiceTemplateCategoryEditor({
  category,
}: {
  category: RRDiceTemplateCategory;
}) {
  const myself = useMyProps("diceTemplateCategories", "id");
  const dispatch = useServerDispatch();
  const confirm = useConfirm();

  async function deleteCategory() {
    if (
      await confirm(
        `Do you really want to delete this category forever? All templates in this category will also be deleted.`
      )
    )
      dispatch({
        actions: [
          playerDeleteDiceTemplateCategory({
            id: myself.id,
            categoryId: category.id,
          }),
        ],
        optimisticKey: "diceTemplateCategories",
        syncToServerThrottle: 0,
      });
  }

  function updateCategory(
    category: RRDiceTemplateCategory,
    newIcon?: typeof categoryIcons[number],
    newName?: string
  ) {
    dispatch({
      actions: [
        playerUpdateDiceTemplateCategory({
          id: myself.id,
          category: {
            id: category.id,
            changes: {
              icon: newIcon ?? category.icon,
              categoryName: newName ?? category.categoryName,
            },
          },
        }),
      ],
      optimisticKey: "diceTemplateCategories",
      syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
    });
  }

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ width: "170px" }}>
      <SmartTextInput
        value={category.categoryName}
        onChange={(name) => updateCategory(category, undefined, name)}
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
                updateCategory(category, icon);
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
