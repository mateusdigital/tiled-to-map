//~---------------------------------------------------------------------------//
//                               *       +                                    //
//                         "                  |                               //
//                     ()    .-.,="``"=.    - o -                             //
//                           "=/_       \     |                               //
//                        *   |  "=._    |                                    //
//                             \     `=./`,        "                          //
//                          .   "=.__.=" `="      *                           //
//                 +                         +                                //
//                      O      *        "       .                             //
//                                                                            //
//  File      : index.js                                                      //
//  Project   : tiled-to-map                                                  //
//  Date      : 2024-03-17                                                    //
//  License   : See project"s COPYING.TXT for full info.                      //
//  Author    : mateus.digital <hello@mateus.digital>                         //
//  Copyright : mateus.digital - 2024                                         //
//                                                                            //
//  Description :                                                             //
//                                                                            //
//---------------------------------------------------------------------------~//


//
// Imports
//

// -----------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");

const yargs = require("yargs");
const xml2js = require("xml2js");

const packageJson = require("./package.json");

//
// Constants
//

// -----------------------------------------------------------------------------
const PROGRAM_NAME = "tiled-to-map";
const PROGRAM_VERSION = packageJson.version;
const PROGRAM_AUTHOR_FULL = "mateus.digital <hello@mateus.digital>";
const PROGRAM_AUTHOR_SHORT = "mateus.digital";
const PROGRAM_COPYRIGHT_YEARS = "2024";
const PROGRAM_WEBSITE = "https://mateus.digital";


//------------------------------------------------------------------------------
Options = handleCommandLineOptions();


//
// Command line args
//

//------------------------------------------------------------------------------
function handleCommandLineOptions() {
  const options = yargs(process.argv.slice(2))
    .usage(`Usage: ${PROGRAM_NAME} --input-path [inputPath] --output-path [outputPath]`)
    .option("help", {
      describe: "Show this screen",
      type: "boolean"
    }).alias("h", "help")

    .version(false)
    .option("version", {
      describe: "Show version information",
      type: "boolean"
    }).alias("v", "version")

    .option("input-path", {
      describe: "Path to the images directory",
      type: "string",
    })

    .option("output-path", {
      describe: "Path to the sprite sheet destination",
      type: "string",
    })

    .example(`${PROGRAM_NAME} --input-path image.psd --output-path image.png `);


  //----------------------------------------------------------------------------
  if (options.argv.help) {
    yargs.showHelp();
    process.exit();
  }

  if (options.argv.version) {
    console.log(`${PROGRAM_NAME} - ${PROGRAM_VERSION} - ${PROGRAM_AUTHOR_FULL}`);
    console.log(`Copyright (c) ${PROGRAM_COPYRIGHT_YEARS} - ${PROGRAM_AUTHOR_SHORT}`);
    console.log(`This is a free software (GPLv3) - Share/Hack it`);
    console.log(`Check ${PROGRAM_WEBSITE} for more :)`);
    console.log("");
    process.exit();
  }

  const inputPath = options.argv["input-path"];
  let outputPath = options.argv["output-path"];

  if (!inputPath) {
    console.error("Missing input-path\n");
    yargs.showHelp();
    process.exit(1);
  }

  if (!outputPath) {
    outputPath = inputPath.replace(".tmx", "");
  }

  return {
    inputPath: inputPath,
    outputPath: outputPath,
  }
}

//
// Program
//

// -----------------------------------------------------------------------------
fs.readFile(Options.inputPath, "utf-8", (err, data) => {
  if (err) {
    console.error("Error reading XML file:", err);
    return;
  }

  xml2js.parseString(data, (err, result) => {
    if (err) {
      console.error("Error parsing XML:", err);
      return;
    }


    const width  = parseInt(result.map.$.width);
    const height = parseInt(result.map.$.height);

    const mapData   = result.map.layer[0].data[0]._;
    const cleanData = mapData.replace("\r\n", "").replace("\n", "");
    const mapTiles  = cleanData.split(",");

    generateOutput(mapTiles, width, height);
  });
});

//------------------------------------------------------------------------------
function _getDate()
{
  const currentDate = new Date();
  return currentDate;
}

//------------------------------------------------------------------------------
function _makeTilesValuesHex(tiles, mapWidth, writeAsHex = false)
{
  const leading_str = (writeAsHex) ? "0x" : "" ;
  const base        = (writeAsHex) ? "16" : 10 ;

  let tiles_str = "";
  for(let i = 0; i < tiles.length; ++i) {
    const tile = tiles[i];

    let parsed = (parseInt(tile) - 1).toString(base);
    if(writeAsHex) {
      parsed = parsed.padStart(3, 0);
    } else {
      parsed = " " + " ".repeat(3 - parsed.length) + parsed;
    }

    const tile_str  = leading_str + parsed;
    if(i % mapWidth == 0 && i != 0) {
      tiles_str += "\n    ";
    }
    tiles_str += `${tile_str},`;
  }

  return tiles_str;
}

//------------------------------------------------------------------------------
function generateOutput(mapTiles, mapWidth, mapHeight)
{
  const TEMPLATE_HEADER_FILENAME = path.join(__dirname, "template", "template.h");
  const TEMPLATE_SOURCE_FILENAME = path.join(__dirname, "template", "template.c");

  const header = fs.readFileSync(TEMPLATE_HEADER_FILENAME, "utf-8");
  const source = fs.readFileSync(TEMPLATE_SOURCE_FILENAME, "utf-8");

  const output_clean_filename = path.basename(Options.outputPath, path.extname(Options.outputPath));

  const templated_header = header
    .replace(new RegExp("__EXPORT_HEADER_FILENAME__", "g"), output_clean_filename + ".h")
    .replace(new RegExp("__MAP_WIDTH__"             , "g"), mapWidth)
    .replace(new RegExp("__MAP_HEIGHT__"            , "g"), mapHeight)
    .replace(new RegExp("__IMPORT_TILED_FILENAME__" , "g"), Options.inputPath)
    .replace(new RegExp("__PROGRAM_NAME__"          , "g"), PROGRAM_NAME)
    .replace(new RegExp("__PROGRAM_VERSION__"       , "g"), PROGRAM_VERSION)
    .replace(new RegExp("__CURRENT_DATE__"          , "g"), _getDate())
    .replace(new RegExp("__INCLUDE_GUARD__"         , "g"), output_clean_filename.toUpperCase() + "__INCLUDE")
    .replace(new RegExp("__DEFINE_MAP_WIDTH__"      , "g"), output_clean_filename + "_WIDTH")
    .replace(new RegExp("__DEFINE_MAP_HEIGHT__"     , "g"), output_clean_filename + "_HEIGHT")
    .replace(new RegExp("__VAR_MAP_NAME__"          , "g"), output_clean_filename + "_TILES");

  const templated_source = source
    .replace(new RegExp("__EXPORT_SOURCE_FILENAME__", "g"), output_clean_filename + ".c")
    .replace(new RegExp("__MAP_WIDTH__"             , "g"), mapWidth)
    .replace(new RegExp("__MAP_HEIGHT__"            , "g"), mapHeight)
    .replace(new RegExp("__IMPORT_TILED_FILENAME__" , "g"), Options.inputPath)
    .replace(new RegExp("__PROGRAM_NAME__"          , "g"), PROGRAM_NAME)
    .replace(new RegExp("__PROGRAM_VERSION__"       , "g"), PROGRAM_VERSION)
    .replace(new RegExp("__CURRENT_DATE__"          , "g"), _getDate())
    .replace(new RegExp("__INCLUDE_GUARD__"         , "g"), output_clean_filename.toUpperCase() + "__INCLUDE")
    .replace(new RegExp("__DEFINE_MAP_WIDTH__"      , "g"), output_clean_filename + "_WIDTH")
    .replace(new RegExp("__DEFINE_MAP_HEIGHT__"     , "g"), output_clean_filename + "_HEIGHT")
    .replace(new RegExp("__VAR_MAP_NAME__"          , "g"), output_clean_filename + "_TILES")
    .replace(new RegExp("__MAP_DATA__"              , "g"), _makeTilesValuesHex(mapTiles, mapWidth));

  fs.writeFileSync(Options.outputPath + ".h", templated_header);
  fs.writeFileSync(Options.outputPath + ".c", templated_source);
}
