import React from "react";

const licenses = {
  "CC-BY 3.0": {
    name: "CC-BY 3.0",
    url: "https://creativecommons.org/licenses/by/3.0/",
  },
};

export function Acknowledgements() {
  const iconAuthors = {
    Cathelineau: { license: licenses["CC-BY 3.0"], url: null },
    Delapouite: {
      license: licenses["CC-BY 3.0"],
      url: "https://delapouite.com",
    },
    Faithtoken: {
      license: licenses["CC-BY 3.0"],
      url: "http://fungustoken.deviantart.com",
    },
    Lorc: {
      license: licenses["CC-BY 3.0"],
      url: "http://lorcblog.blogspot.com",
    },
    Skoll: { license: licenses["CC-BY 3.0"], url: null },
  };
  return (
    <>
      <h3>Icons</h3>
      {/* required by the CC-BY license */}
      Some of the icons we use come from{" "}
      <a href="https://game-icons.net/" target="_blank" rel="noreferrer">
        https://game-icons.net/
      </a>
      , created by the following authors:
      <ul>
        {Object.entries(iconAuthors).map(([name, { license, url }]) => (
          <li key={name}>
            {name}{" "}
            {url && (
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            )}{" "}
            (
            <a href={license.url} target="_blank" rel="noreferrer">
              {license.name}
            </a>
            )
          </li>
        ))}
      </ul>
    </>
  );
}
