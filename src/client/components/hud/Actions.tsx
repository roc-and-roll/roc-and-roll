import {
  faBalanceScale,
  faBook,
  faBroom,
  faCat,
  faComments,
  faDiceD20,
  faDragon,
  faDungeon,
  faFeather,
  faFire,
  faFistRaised,
  faFlask,
  faHandHoldingMedical,
  faHandPaper,
  faHatWizard,
  faHeart,
  faHiking,
  faHorse,
  faMagic,
  faPlus,
  faPrayingHands,
  faScroll,
  faShieldAlt,
  faWrench,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState, useEffect, useMemo } from "react";
import {
  playerAddDiceTemplateCategory,
  playerUpdateDiceTemplateCategory,
  playerDeleteDiceTemplateCategory,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import {
  categoryIcons,
  characterStatNames,
  fixedCategoryIcons,
  RRDiceTemplateCategoryID,
  RRDiceTemplatePart,
  RRDiceTemplatePartDice,
  skillMap,
  skillNames,
  userCategoryIcons,
} from "../../../shared/state";
import { rrid } from "../../../shared/util";
import {
  RRDiceTemplate,
  RRDiceTemplateCategory,
} from "../../../shared/validation";
import { useConfirm } from "../../dialog-boxes";
import { useMyProps, useMySelectedCharacters } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import { DicePanel } from "../diceTemplates/DicePanel";
import { DiceTemplates } from "../diceTemplates/DiceTemplates";
import { GeneratedDiceTemplates } from "../diceTemplates/GeneratedDiceTemplates";
import { Popover } from "../Popover";
import { RRTooltip } from "../RRTooltip";
import { Button } from "../ui/Button";
import { SmartTextInput } from "../ui/TextInput";

export const iconMap: Record<typeof categoryIcons[number], IconDefinition> = {
  book: faBook,
  broom: faBroom,
  cat: faCat,
  comments: faComments,
  dragon: faDragon,
  dungeon: faDungeon,
  feather: faFeather,
  fire: faFire,
  fist: faFistRaised,
  flask: faFlask,
  handHoldingMedical: faHandHoldingMedical,
  hand: faHandPaper,
  hatWizard: faHatWizard,
  heart: faHeart,
  hiking: faHiking,
  horse: faHorse,
  magic: faMagic,
  prayingHands: faPrayingHands,
  scales: faBalanceScale,
  scroll: faScroll,
  shield: faShieldAlt,
  wrench: faWrench,
  d20: faDiceD20,
};

type Section =
  | "closed"
  | "Dice Input"
  | "Skills"
  | "STs"
  | RRDiceTemplateCategoryID;

const actionClasses =
  "snap-start border-black border flex items-center justify-center p-3 -mr-px last:mr-0 cursor-pointer";
const activeClass = (active: boolean) =>
  !active ? "hover:bg-rr-600" : "bg-rr-500";
const highlightClass = (shouldHighlight: boolean, active: boolean) =>
  shouldHighlight ? (active ? "bg-green-400" : "bg-green-600") : "";

export const ActionsHUD = React.memo(function ActionsHUD() {
  const [active, setActive] = useState<Section>("closed");
  const myself = useMyProps("diceTemplateCategories", "id", "mainCharacterId");
  const dispatch = useServerDispatch();

  const toggle = (section: Section) =>
    setActive((a) => (a === section ? "closed" : section));

  useEffect(() => {
    if (
      active !== "Dice Input" &&
      active !== "Skills" &&
      active !== "STs" &&
      myself.diceTemplateCategories.find((cat) => cat.id === active) ===
        undefined
    ) {
      setActive("closed");
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
  const mainCharacter = useServerState((state) =>
    myself.mainCharacterId
      ? state.characters.entities[myself.mainCharacterId] ?? null
      : null
  );
  const selectedCharacters = useMySelectedCharacters(
    "id",
    "savingThrows",
    "skills"
  );
  const character =
    selectedCharacters.length === 1 ? selectedCharacters[0]! : mainCharacter;

  const isCharacterNull = character === null;
  const savingThrowTemplates = useMemo(
    () =>
      characterStatNames.map((statName: typeof characterStatNames[number]) => {
        const proficiency = isCharacterNull
          ? "notProficient"
          : character.savingThrows[statName] ?? "notProficient";

        const parts: RRDiceTemplatePart[] = [createD20Part()];
        if (typeof proficiency !== "number")
          parts.push({
            id: rrid<RRDiceTemplatePart>(),
            type: "linkedStat",
            name: statName,
            damage: { type: null },
          });

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
      skillNames
        .map((skill) => {
          const proficiency = isCharacterNull
            ? "notProficient"
            : character.skills[skill] ?? "notProficient";
          const parts: RRDiceTemplatePart[] = [createD20Part()];
          if (typeof proficiency !== "number")
            parts.push({
              id: rrid<RRDiceTemplatePart>(),
              type: "linkedStat",
              name: skillMap[skill],
              damage: { type: null },
            });
          if (proficiency !== "notProficient")
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
        })
        .sort(),
    [isCharacterNull, character?.skills]
  );

  function renderContent(active: string) {
    const category = myself.diceTemplateCategories.find(
      (cat) => cat.id === active
    );
    switch (active) {
      case "Dice Input":
        return <DicePanel />;
      case "Skills":
        return <GeneratedDiceTemplates templates={skillTemplates} />;
      case "STs":
        return <GeneratedDiceTemplates templates={savingThrowTemplates} />;
      case "closed":
        return <></>;
      default:
        return <DiceTemplates category={category!} />;
    }
  }

  const shouldHighlight =
    (selectedCharacters.length === 1 &&
      myself.mainCharacterId &&
      selectedCharacters[0]!.id !== myself.mainCharacterId) ??
    false;

  return (
    <div className="absolute bottom-2 top-24 left-20 right-[500px] flex flex-col justify-end items-start z-10 pointer-events-none">
      <div className="hud-panel w-[370px] rounded-b-none pointer-events-auto overflow-y-auto">
        {renderContent(active)}
      </div>

      {/* TODO: The layout is a bit messed up when the scrollbar is shown. */}
      <div
        className={clsx(
          "hud-panel max-w-full shrink-0 inline-flex overflow-x-auto snap-x pointer-events-auto",
          { "rounded-tl-none": active !== "closed" }
        )}
      >
        <RRTooltip content="Dice Input" placement="top">
          <Button
            unstyled
            className={clsx(
              actionClasses,
              activeClass(active === "Dice Input")
            )}
            onClick={() => toggle("Dice Input")}
          >
            <FontAwesomeIcon size="lg" icon={faDiceD20} fixedWidth />
          </Button>
        </RRTooltip>
        <RRTooltip content="Saving Throws" placement="top">
          <Button
            unstyled
            className={clsx(
              actionClasses,
              activeClass(active === "STs"),
              highlightClass(shouldHighlight, active === "STs")
            )}
            onClick={() => toggle("STs")}
          >
            <FontAwesomeIcon size="lg" icon={faShieldAlt} fixedWidth />
          </Button>
        </RRTooltip>
        <RRTooltip content="Skill Checks" placement="top">
          <Button
            unstyled
            className={clsx(
              actionClasses,
              activeClass(active === "Skills"),
              highlightClass(shouldHighlight, active === "Skills")
            )}
            onClick={() => toggle("Skills")}
          >
            <FontAwesomeIcon size="lg" icon={faHandPaper} fixedWidth />
          </Button>
        </RRTooltip>
        {myself.diceTemplateCategories.map((category) => (
          <DiceTemplateButton
            key={category.id}
            category={category}
            active={active === category.id}
            onSetActive={() => toggle(category.id)}
          />
        ))}
        {myself.diceTemplateCategories.length < userCategoryIcons.length && (
          <RRTooltip content={"Add Category"} placement="top">
            <Button
              unstyled
              className={actionClasses}
              onClick={() => {
                addTemplateCategory();
              }}
            >
              <FontAwesomeIcon size="lg" icon={faPlus} fixedWidth />
            </Button>
          </RRTooltip>
        )}
      </div>
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
      <RRTooltip
        content={category.categoryName}
        placement="top"
        disabled={category.categoryName.trim().length === 0 || addMenuVisible}
      >
        <Button
          unstyled
          className={clsx(actionClasses, activeClass(active))}
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
        >
          <FontAwesomeIcon icon={iconMap[category.icon]} size="lg" fixedWidth />
        </Button>
      </RRTooltip>
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
    changes: Partial<Pick<RRDiceTemplateCategory, "icon" | "categoryName">>
  ) {
    dispatch({
      actions: [
        playerUpdateDiceTemplateCategory({
          id: myself.id,
          category: { id: category.id, changes },
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
        onChange={(categoryName) => updateCategory(category, { categoryName })}
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
                updateCategory(category, { icon });
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
