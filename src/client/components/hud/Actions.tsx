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
  characterAddDiceTemplateCategory,
  characterDeleteDiceTemplateCategory,
  characterUpdateDiceTemplateCategory,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import {
  categoryIcons,
  fixedCategoryIcons,
  RRCharacter,
  RRDiceTemplateCategoryID,
  userCategoryIcons,
} from "../../../shared/state";
import { rrid } from "../../../shared/util";
import { RRDiceTemplateCategory } from "../../../shared/validation";
import { useConfirm } from "../../dialog-boxes";
import {
  generateSavingThrowTemplates,
  generateSkillTemplates,
} from "../../diceUtils";
import {
  useMyActiveCharacters,
  useMyProps,
  useMySelectedCharacters,
} from "../../myself";
import { useServerDispatch } from "../../state";
import { DicePanel } from "../diceTemplates/DicePanel";
import { DiceTemplates } from "../diceTemplates/DiceTemplates";
import { GeneratedDiceTemplates } from "../diceTemplates/GeneratedDiceTemplates";
import { Popover } from "../Popover";
import { RRTooltip } from "../RRTooltip";
import { Button } from "../ui/Button";
import { SmartTextInput } from "../ui/TextInput";

export const iconMap: Record<(typeof categoryIcons)[number], IconDefinition> = {
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

const wrapperClasses =
  "absolute bottom-2 top-24 left-20 right-[500px] flex flex-col justify-end items-start z-10 pointer-events-none";
const contentClasses =
  "hud-panel w-[370px] rounded-b-none pointer-events-auto overflow-y-auto";
const buttonClasses =
  "hud-panel max-w-full shrink-0 inline-flex overflow-x-auto snap-x pointer-events-auto";

export const ActionsHUD = React.memo(function ActionsHUDMemoed() {
  const characters = useMyActiveCharacters(
    "id",
    "savingThrows",
    "skills",
    "diceTemplateCategories",
    "stats",
    "attributes"
  );
  return characters.length > 0 ? (
    <InnerActionsHUD characters={characters} />
  ) : (
    <DicePanelOnly />
  );
});

export const DicePanelOnly = function () {
  const [active, setActive] = useState(false);

  return (
    <div className={wrapperClasses}>
      <div className={`${contentClasses} rounded-br`}>
        {active ? <DicePanel /> : <></>}
      </div>
      <div
        className={clsx(buttonClasses, {
          "rounded-tl-none rounded-tr-none": active,
        })}
      >
        <RRTooltip content="Dice Input" placement="top">
          <Button
            unstyled
            className={actionClasses}
            onClick={() => setActive(!active)}
          >
            <FontAwesomeIcon size="lg" icon={faDiceD20} fixedWidth />
          </Button>
        </RRTooltip>
      </div>
    </div>
  );
};

export const InnerActionsHUD = function ({
  characters,
}: {
  characters: Pick<
    RRCharacter,
    | "diceTemplateCategories"
    | "id"
    | "savingThrows"
    | "skills"
    | "stats"
    | "attributes"
  >[];
}) {
  const [active, setActive] = useState<Section>("closed");
  const myself = useMyProps("id", "mainCharacterId");
  const selectedCharacters = useMySelectedCharacters("id");
  const dispatch = useServerDispatch();

  const toggle = (section: Section) =>
    setActive((a) => (a === section ? "closed" : section));

  useEffect(() => {
    if (
      active !== "Dice Input" &&
      active !== "Skills" &&
      active !== "STs" &&
      characters.length !== 1 &&
      characters[0]!.diceTemplateCategories.find((cat) => cat.id === active) ===
        undefined
    ) {
      setActive("closed");
    }
  }, [active, characters]);

  function addTemplateCategory() {
    if (characters.length !== 1) return;
    const freeIcon = userCategoryIcons.find((userIcon) => {
      return !characters[0]!.diceTemplateCategories
        .map(({ icon }: { icon: (typeof categoryIcons)[number] }) => icon)
        .includes(userIcon);
    });

    if (!freeIcon) return;

    dispatch({
      actions: [
        characterAddDiceTemplateCategory({
          id: characters[0]!.id,
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

  const skillTemplates = useMemo(
    () => generateSkillTemplates(characters),
    [characters]
  );
  const savingThrowTemplates = useMemo(
    () => generateSavingThrowTemplates(characters),
    [characters]
  );

  function renderContent(active: string) {
    switch (active) {
      case "Dice Input":
        return <DicePanel />;
      case "Skills":
        return <GeneratedDiceTemplates templates={skillTemplates} />;
      case "STs":
        return <GeneratedDiceTemplates templates={savingThrowTemplates} />;
      case "closed":
        return <></>;
      default: {
        if (characters.length !== 1) return null;
        const category = characters[0]!.diceTemplateCategories.find(
          (cat) => cat.id === active
        );
        return category ? <DiceTemplates category={category} /> : null;
      }
    }
  }

  const shouldHighlight =
    (selectedCharacters.length === 1 &&
      myself.mainCharacterId &&
      selectedCharacters[0]!.id !== myself.mainCharacterId) ??
    false;

  return (
    <div className={wrapperClasses}>
      <div className={contentClasses}>{renderContent(active)}</div>

      {/* TODO: The layout is a bit messed up when the scrollbar is shown. */}
      <div
        className={clsx(buttonClasses, {
          "rounded-tl-none": active !== "closed",
        })}
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
        {characters.length === 1 && (
          <>
            {characters[0]!.diceTemplateCategories.map((category) => (
              <DiceTemplateButton
                key={category.id}
                category={category}
                active={active === category.id}
                onSetActive={() => toggle(category.id)}
              />
            ))}
            {characters[0]!.diceTemplateCategories.length <
              userCategoryIcons.length && (
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
          </>
        )}
      </div>
    </div>
  );
};

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
  const character =
    useMyActiveCharacters("diceTemplateCategories", "id")[0] ?? null;
  const dispatch = useServerDispatch();
  const confirm = useConfirm();

  if (!character) return <></>;

  const deleteCategory = async function () {
    if (
      await confirm(
        `Do you really want to delete this category forever? All templates in this category will also be deleted.`
      )
    )
      dispatch({
        actions: [
          characterDeleteDiceTemplateCategory({
            id: character.id,
            categoryId: category.id,
          }),
        ],
        optimisticKey: "diceTemplateCategories",
        syncToServerThrottle: 0,
      });
  };

  function updateCategory(
    category: RRDiceTemplateCategory,
    changes: Partial<Pick<RRDiceTemplateCategory, "icon" | "categoryName">>
  ) {
    dispatch({
      actions: [
        characterUpdateDiceTemplateCategory({
          id: character!.id,
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
            character.diceTemplateCategories.findIndex(
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
