import type { DiseaseClass } from "./ml-model";

export type CropId =
  | "rice"
  | "wheat"
  | "maize"
  | "cotton"
  | "soybean"
  | "tomato"
  | "potato"
  | "banana";

export type CropCategory = "Cereal" | "Fiber" | "Oilseed" | "Vegetable" | "Fruit";
export type SchemeTag = "income" | "insurance" | "market" | "soil" | "organic" | "horticulture" | "credit" | "directory";
export type DiseaseCauseType = "Fungal" | "Bacterial" | "Viral" | "Oomycete" | "Nutrient" | "Physiological";
export type SymptomClass = Exclude<DiseaseClass, "Healthy">;

export type DiseaseKnowledge = {
  id: string;
  symptomClass: SymptomClass;
  name: string;
  causeType: DiseaseCauseType;
  causalAgent: string;
  coreCause: string;
  identification: string[];
  triggers: string[];
  immediateActions: string[];
  prevention: string[];
  marketRisk: string;
};

export type CropProfile = {
  id: CropId;
  name: string;
  scientificName: string;
  category: CropCategory;
  aliases: string[];
  summary: string;
  primaryMarkets: string[];
  schemeTags: SchemeTag[];
  healthSignals: string[];
  diseaseGuide: DiseaseKnowledge[];
};

export type GovernmentScheme = {
  id: string;
  title: string;
  benefit: string;
  relevance: string;
  eligibility: string;
  officialUrl: string;
  sourceLabel: string;
  tags: SchemeTag[];
};

export type MarketRecommendation = {
  id: string;
  title: string;
  buyerType: string;
  description: string;
  directBenefit: string;
  locationLabel: string;
  query: string;
  mapsUrl: string;
};

export type DiseaseFamilyOverview = {
  id: string;
  label: string;
  summary: string;
};

export type CropIntelligence = {
  crop: CropProfile | null;
  primaryDisease: DiseaseKnowledge | null;
  watchlist: DiseaseKnowledge[];
  schemes: GovernmentScheme[];
  markets: MarketRecommendation[];
  families: DiseaseFamilyOverview[];
  coverageText: string;
  cropSpecific: boolean;
};

type Coordinates = { lat: number; lon: number } | null;

type MarketBlueprint = {
  id: string;
  title: string;
  buyerType: string;
  description: string;
  directBenefit: string;
  supports: CropCategory[];
  buildQuery: (cropLabel: string, locationLabel: string) => string;
};

const createMapsUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const disease = (entry: DiseaseKnowledge) => entry;

export const WORLD_DISEASE_FAMILIES: DiseaseFamilyOverview[] = [
  { id: "fungal", label: "Fungal", summary: "Leaf spots, rusts, mildew, and blast spread fastest in humid canopies." },
  { id: "bacterial", label: "Bacterial", summary: "Blights and cankers often move with wounds, tools, and splash water." },
  { id: "viral", label: "Viral", summary: "Vector-driven curl and mosaic symptoms need insect pressure control, not only sprays." },
  { id: "oomycete", label: "Oomycete", summary: "Late blight and downy mildew groups surge in cool wet weather." },
  { id: "nutrient", label: "Nutrient And Abiotic", summary: "Heat, moisture, salinity, and deficiency stress can mimic disease early." },
];

const GENERIC_DISEASE_GUIDE: Record<SymptomClass, DiseaseKnowledge> = {
  "Leaf Spot Symptoms Detected": disease({
    id: "generic-leaf-spot",
    symptomClass: "Leaf Spot Symptoms Detected",
    name: "Leaf Spot Complex",
    causeType: "Fungal",
    causalAgent: "Mixed fungal and bacterial pathogens",
    coreCause: "Long leaf wetness plus infected residue usually starts a leaf-spot cycle.",
    identification: ["Round or irregular yellow-brown lesions", "Spots enlarge and merge in humid weather"],
    triggers: ["Frequent dew or rain", "Dense canopy and poor airflow"],
    immediateActions: ["Remove badly infected leaves", "Reduce leaf wetness where possible"],
    prevention: ["Use clean planting material", "Rotate crops and manage residue"],
    marketRisk: "Leaf spots cut photosynthesis and lower crop grade and yield.",
  }),
  "Bacterial Blight / Late Blight": disease({
    id: "generic-blight",
    symptomClass: "Bacterial Blight / Late Blight",
    name: "Blight Complex",
    causeType: "Oomycete",
    causalAgent: "Aggressive water-loving pathogens or bacteria",
    coreCause: "Fast-moving blights build when foliage stays wet and inoculum is already present.",
    identification: ["Water-soaked or fast-browning patches", "Rapid spread across multiple leaves"],
    triggers: ["Cool wet weather", "Splash spread and infected plant debris"],
    immediateActions: ["Isolate hotspots early", "Protect healthy foliage with crop-specific action"],
    prevention: ["Scout after rain events", "Use resistant varieties when available"],
    marketRisk: "Blight is one of the quickest ways to lose marketable yield.",
  }),
  "Mild Leaf Stress": disease({
    id: "generic-stress",
    symptomClass: "Mild Leaf Stress",
    name: "Nutrition Or Physiological Stress",
    causeType: "Nutrient",
    causalAgent: "Deficiency, drought, heat, or root stress",
    coreCause: "Not all yellowing is disease. Root-zone and nutrition issues often show first on leaves.",
    identification: ["General chlorosis without clear lesion edges", "Uneven crop vigor across the block"],
    triggers: ["Low soil fertility", "Heat, drought, or compaction"],
    immediateActions: ["Check irrigation and nutrition first", "Confirm before spraying"],
    prevention: ["Balanced nutrition", "Keep the root zone stable"],
    marketRisk: "Stress lowers vigor and makes the crop easier for real disease to attack.",
  }),
  "Rust / Fungal Infection": disease({
    id: "generic-rust",
    symptomClass: "Rust / Fungal Infection",
    name: "Rust Or Mildew Complex",
    causeType: "Fungal",
    causalAgent: "Rust fungi and mildew fungi",
    coreCause: "Airborne spores settle on susceptible leaves and multiply under humid nights.",
    identification: ["Orange, brown, or powdery fungal growth", "Scattered pustules or mildew colonies"],
    triggers: ["Humid nights", "Volunteer hosts and late scouting"],
    immediateActions: ["Scout the full block", "Protect healthy foliage before spread accelerates"],
    prevention: ["Destroy volunteer hosts", "Rotate fungicide groups and manage canopy humidity"],
    marketRisk: "Rust and mildew reduce green leaf area and crop appearance quickly.",
  }),
};

export const CROP_LIBRARY: CropProfile[] = [
  {
    id: "rice",
    name: "Rice",
    scientificName: "Oryza sativa",
    category: "Cereal",
    aliases: ["Paddy", "Dhan"],
    summary: "Rice disease decisions should separate blast, blight, and zinc stress before yield drops.",
    primaryMarkets: ["Mandi", "Millers", "Procurement centers", "FPO sale"],
    schemeTags: ["income", "insurance", "market", "soil", "credit"],
    healthSignals: ["Uniform green tillers", "No spindle lesions", "No leaf-tip drying"],
    diseaseGuide: [
      disease({
        id: "rice-brown-spot",
        symptomClass: "Leaf Spot Symptoms Detected",
        name: "Rice Brown Spot",
        causeType: "Fungal",
        causalAgent: "Bipolaris oryzae",
        coreCause: "Weak seed vigor, nutrient imbalance, and humidity let brown spot establish.",
        identification: ["Brown oval lesions with gray centers", "Older leaves show scattered spots first"],
        triggers: ["Potassium stress", "Warm humid weather"],
        immediateActions: ["Correct crop stress", "Protect new foliage if lesions keep climbing"],
        prevention: ["Use healthy seed", "Maintain balanced nutrition"],
        marketRisk: "Severe infection reduces grain filling and milling quality.",
      }),
      disease({
        id: "rice-bacterial-blight",
        symptomClass: "Bacterial Blight / Late Blight",
        name: "Rice Bacterial Leaf Blight",
        causeType: "Bacterial",
        causalAgent: "Xanthomonas oryzae pv. oryzae",
        coreCause: "Wind-driven rain and wounded leaves move the bacteria rapidly.",
        identification: ["Long yellow to straw streaks from the leaf tip", "Fast drying of leaf edges"],
        triggers: ["Storm damage", "Standing water movement"],
        immediateActions: ["Avoid leaf injury", "Confirm before crop-specific treatment"],
        prevention: ["Use tolerant varieties", "Keep nitrogen balanced"],
        marketRisk: "Blight can sharply cut tiller productivity and yield.",
      }),
      disease({
        id: "rice-blast",
        symptomClass: "Rust / Fungal Infection",
        name: "Rice Blast",
        causeType: "Fungal",
        causalAgent: "Magnaporthe oryzae",
        coreCause: "Blast thrives where leaves stay wet and lush tissue stays vulnerable.",
        identification: ["Spindle-shaped lesions with gray centers", "Neck infection can leave blank panicles"],
        triggers: ["Cloudy wet weather", "Dense canopy and heavy nitrogen"],
        immediateActions: ["Scout before heading", "Protect healthy tillers early"],
        prevention: ["Choose resistant varieties", "Avoid late heavy nitrogen"],
        marketRisk: "Blast can collapse panicle fill fast.",
      }),
      disease({
        id: "rice-zinc-stress",
        symptomClass: "Mild Leaf Stress",
        name: "Rice Zinc Deficiency Stress",
        causeType: "Nutrient",
        causalAgent: "Low zinc availability",
        coreCause: "Flooded alkaline soils often lock zinc away from young roots.",
        identification: ["Bronzing or pale streaking on young leaves", "Poor tillering and stunting"],
        triggers: ["High soil pH", "Cool wet early growth"],
        immediateActions: ["Confirm with field history or test", "Correct zinc instead of blanket fungicide use"],
        prevention: ["Support early root growth", "Apply zinc in deficient fields"],
        marketRisk: "Untreated stress weakens the stand before disease even starts.",
      }),
    ],
  },
  {
    id: "wheat",
    name: "Wheat",
    scientificName: "Triticum aestivum",
    category: "Cereal",
    aliases: ["Gehu"],
    summary: "Wheat profit depends on protecting upper leaves from rust, streak, and stress during grain fill.",
    primaryMarkets: ["Wholesale mandi", "Procurement centers", "Flour mills"],
    schemeTags: ["income", "insurance", "market", "soil", "credit"],
    healthSignals: ["Clean flag leaf", "Even canopy color", "No orange pustules"],
    diseaseGuide: [
      disease({
        id: "wheat-septoria",
        symptomClass: "Leaf Spot Symptoms Detected",
        name: "Wheat Septoria Blotch",
        causeType: "Fungal",
        causalAgent: "Zymoseptoria tritici",
        coreCause: "Residue-borne inoculum splashes upward in cool wet periods.",
        identification: ["Irregular brown blotches", "Tiny black fruiting bodies in lesions"],
        triggers: ["Frequent rain splash", "Continuous wheat residue"],
        immediateActions: ["Protect upper canopy before flag leaf loss", "Scout lesion height often"],
        prevention: ["Rotate away from residue pressure", "Use tolerant varieties"],
        marketRisk: "Flag-leaf damage cuts grain fill and test weight.",
      }),
      disease({
        id: "wheat-bacterial-streak",
        symptomClass: "Bacterial Blight / Late Blight",
        name: "Wheat Bacterial Leaf Streak",
        causeType: "Bacterial",
        causalAgent: "Xanthomonas translucens",
        coreCause: "Seedborne inoculum and storms move bacterial streak through wet wheat.",
        identification: ["Translucent streaks between veins", "Papery necrosis after lesions dry"],
        triggers: ["Wind and hail injury", "Warm wet weather"],
        immediateActions: ["Avoid field work while wet", "Confirm before treating"],
        prevention: ["Use clean seed", "Reduce volunteer cereal hosts"],
        marketRisk: "Weakens photosynthetic area and raises downgrade risk.",
      }),
      disease({
        id: "wheat-leaf-rust",
        symptomClass: "Rust / Fungal Infection",
        name: "Wheat Leaf Rust",
        causeType: "Fungal",
        causalAgent: "Puccinia triticina",
        coreCause: "Airborne spores build quickly on susceptible wheat in mild humid weather.",
        identification: ["Orange-brown pustules on leaves", "Green area fades around each pustule"],
        triggers: ["Humid weather", "Late planting into inoculum pressure"],
        immediateActions: ["Check the whole field", "Protect upper canopy before flag leaves are hit"],
        prevention: ["Use resistant genetics", "Time fungicide to growth stage"],
        marketRisk: "Rust strips yield potential late if upper leaves are lost.",
      }),
      disease({
        id: "wheat-nitrogen-stress",
        symptomClass: "Mild Leaf Stress",
        name: "Wheat Nitrogen Or Moisture Stress",
        causeType: "Nutrient",
        causalAgent: "Low nitrogen or uneven moisture",
        coreCause: "When roots cannot access enough nitrogen or water, wheat yellows before lesions appear.",
        identification: ["General pale canopy", "Older leaves lose color first"],
        triggers: ["Low fertility zones", "Dry spells after fast vegetative growth"],
        immediateActions: ["Check moisture and top-dress timing", "Differentiate stress from disease"],
        prevention: ["Use split nutrition plans", "Keep moisture more uniform"],
        marketRisk: "Stress lowers tiller survival and grain weight.",
      }),
    ],
  },
  {
    id: "maize",
    name: "Maize",
    scientificName: "Zea mays",
    category: "Cereal",
    aliases: ["Corn", "Makka"],
    summary: "Maize leaf health directly drives cob size, especially when gray leaf spot or rust reaches upper leaves.",
    primaryMarkets: ["Feed mills", "Wholesale market", "Processing buyers"],
    schemeTags: ["income", "insurance", "market", "soil", "credit"],
    healthSignals: ["Strong green leaves", "No rectangular lesions", "Healthy ear leaf"],
    diseaseGuide: [
      disease({
        id: "maize-gray-leaf-spot",
        symptomClass: "Leaf Spot Symptoms Detected",
        name: "Maize Gray Leaf Spot",
        causeType: "Fungal",
        causalAgent: "Cercospora zeae-maydis",
        coreCause: "Residue plus humid nights create classic gray leaf spot epidemics.",
        identification: ["Long rectangular gray lesions", "Lesions run parallel to the veins"],
        triggers: ["Residue without rotation", "Humid still canopy"],
        immediateActions: ["Protect ear leaf and upper canopy", "Scout lesion height relative to the ear zone"],
        prevention: ["Rotate crops", "Use tolerant hybrids"],
        marketRisk: "Upper-leaf loss reduces kernel fill and grain quality.",
      }),
      disease({
        id: "maize-leaf-blight",
        symptomClass: "Bacterial Blight / Late Blight",
        name: "Northern Corn Leaf Blight",
        causeType: "Fungal",
        causalAgent: "Exserohilum turcicum",
        coreCause: "Cool humid weather supports the long cigar-shaped lesions of this blight.",
        identification: ["Large tan cigar-shaped lesions", "Fast lesion expansion on susceptible hybrids"],
        triggers: ["Long dew periods", "High residue inoculum"],
        immediateActions: ["Scout before tasseling", "Protect the green ear leaf zone"],
        prevention: ["Use resistant hybrids", "Break disease cycles with rotation"],
        marketRisk: "Blight can reduce cob fill and silage quality.",
      }),
      disease({
        id: "maize-common-rust",
        symptomClass: "Rust / Fungal Infection",
        name: "Maize Common Rust",
        causeType: "Fungal",
        causalAgent: "Puccinia sorghi",
        coreCause: "Rust spores multiply fast when leaves stay humid and temperatures stay moderate.",
        identification: ["Cinnamon-brown pustules", "Pustules shed spores easily"],
        triggers: ["Humid weather", "Young susceptible hybrids"],
        immediateActions: ["Monitor spread around tasseling", "Protect upper canopy if pustules are moving fast"],
        prevention: ["Hybrid resistance", "Timely scouting"],
        marketRisk: "Rust reduces photosynthetic area and grain yield.",
      }),
      disease({
        id: "maize-zinc-stress",
        symptomClass: "Mild Leaf Stress",
        name: "Maize Zinc Deficiency Stress",
        causeType: "Nutrient",
        causalAgent: "Low zinc availability",
        coreCause: "Young maize shows zinc stress quickly when root growth is restricted.",
        identification: ["Pale bands near the midrib", "Short internodes and stunting"],
        triggers: ["Cool wet soils", "High pH fields"],
        immediateActions: ["Correct with targeted zinc nutrition", "Avoid treating deficiency as fungus"],
        prevention: ["Use zinc in deficient fields", "Support early root growth"],
        marketRisk: "Early stress delays canopy closure and lowers cob potential.",
      }),
    ],
  },
  {
    id: "cotton",
    name: "Cotton",
    scientificName: "Gossypium hirsutum",
    category: "Fiber",
    aliases: ["Kapas"],
    summary: "Cotton leaf losses quickly hit boll load and fiber quality, especially when blight or nutrient stress is missed.",
    primaryMarkets: ["Ginning mills", "Cotton mandi", "FPO aggregation"],
    schemeTags: ["income", "insurance", "market", "soil", "credit"],
    healthSignals: ["Broad dark leaves", "No angular lesions", "Even boll retention"],
    diseaseGuide: [
      disease({
        id: "cotton-alternaria",
        symptomClass: "Leaf Spot Symptoms Detected",
        name: "Cotton Alternaria Leaf Spot",
        causeType: "Fungal",
        causalAgent: "Alternaria macrospora",
        coreCause: "Alternaria exploits stressed cotton leaves and spreads under humidity.",
        identification: ["Brown circular spots with target-like rings", "Defoliation starts as lesions merge"],
        triggers: ["High humidity", "Nutrient-stressed foliage"],
        immediateActions: ["Protect canopy before defoliation begins", "Correct underlying crop stress"],
        prevention: ["Keep nutrition balanced", "Destroy infected residue"],
        marketRisk: "Premature leaf drop weakens boll filling and fiber development.",
      }),
      disease({
        id: "cotton-bacterial-blight",
        symptomClass: "Bacterial Blight / Late Blight",
        name: "Cotton Bacterial Blight",
        causeType: "Bacterial",
        causalAgent: "Xanthomonas citri pv. malvacearum",
        coreCause: "Seedborne inoculum and splash spread create angular lesions and stem infection.",
        identification: ["Angular water-soaked spots bounded by veins", "Stem lesions may show black-arm symptoms"],
        triggers: ["Rain splash", "Infected seed and susceptible varieties"],
        immediateActions: ["Avoid field work in wet foliage", "Confirm seed source and hotspot spread"],
        prevention: ["Use resistant seed", "Start with clean seed lots"],
        marketRisk: "Blight reduces stand vigor, boll retention, and lint quality.",
      }),
      disease({
        id: "cotton-areolate-mildew",
        symptomClass: "Rust / Fungal Infection",
        name: "Cotton Areolate Mildew",
        causeType: "Fungal",
        causalAgent: "Ramulariopsis species complex",
        coreCause: "Persistent humidity on the lower leaf surface helps mildew colonies expand.",
        identification: ["Yellow patches above and mildew below", "Leaves bronze and shed later"],
        triggers: ["Cloudy humid spells", "Dense late-season canopy"],
        immediateActions: ["Scout the underside of leaves", "Protect remaining canopy before leaf drop"],
        prevention: ["Improve airflow", "Keep disease pressure low before boll fill"],
        marketRisk: "Late canopy collapse reduces boll maturity and harvest efficiency.",
      }),
      disease({
        id: "cotton-potassium-stress",
        symptomClass: "Mild Leaf Stress",
        name: "Cotton Potassium Stress",
        causeType: "Nutrient",
        causalAgent: "Insufficient potassium during heavy fruit load",
        coreCause: "High boll demand can outpace potassium supply and mimic disease at the leaf edge.",
        identification: ["Leaf margins yellow then scorch", "Upper canopy reddening with weak boll fill"],
        triggers: ["High fruit load", "Low available potassium"],
        immediateActions: ["Review crop load and nutrition plan", "Treat deficiency as nutrition first"],
        prevention: ["Maintain potassium through peak fruiting", "Watch high-yield blocks closely"],
        marketRisk: "Potassium stress lowers boll retention and fiber quality.",
      }),
    ],
  },
  {
    id: "soybean",
    name: "Soybean",
    scientificName: "Glycine max",
    category: "Oilseed",
    aliases: ["Soy"],
    summary: "Soybean disease pressure builds quietly, and rust or brown spot can cut both yield and seed quality.",
    primaryMarkets: ["Oil mills", "Trader networks", "Bulk procurement"],
    schemeTags: ["income", "insurance", "market", "soil", "credit"],
    healthSignals: ["Uniform trifoliate color", "No pustules", "Healthy pods and upper canopy"],
    diseaseGuide: [
      disease({
        id: "soybean-brown-spot",
        symptomClass: "Leaf Spot Symptoms Detected",
        name: "Soybean Septoria Brown Spot",
        causeType: "Fungal",
        causalAgent: "Septoria glycines",
        coreCause: "Residue-borne inoculum and humidity make brown spot common in dense soybean canopies.",
        identification: ["Small dark spots on lower leaves", "Infection climbs upward in extended humidity"],
        triggers: ["Continuous soybean residue", "Humid lower canopy"],
        immediateActions: ["Protect upper canopy if disease is climbing", "Improve scouting depth"],
        prevention: ["Rotate crops", "Reduce residue pressure"],
        marketRisk: "Heavy brown spot reduces leaf area and pod fill.",
      }),
      disease({
        id: "soybean-bacterial-blight",
        symptomClass: "Bacterial Blight / Late Blight",
        name: "Soybean Bacterial Blight",
        causeType: "Bacterial",
        causalAgent: "Pseudomonas syringae pv. glycinea",
        coreCause: "Cool rainy weather and splashing water move bacterial blight through young soybean leaves.",
        identification: ["Angular lesions with yellow halos", "Tissue tears and looks ragged after drying"],
        triggers: ["Cool wet weather", "Storm injury and splash spread"],
        immediateActions: ["Avoid unnecessary field movement while wet", "Do not assume fungus by default"],
        prevention: ["Start with clean seed", "Reduce canopy splash pressure"],
        marketRisk: "Leaf loss slows canopy function and lowers pod set.",
      }),
      disease({
        id: "soybean-rust",
        symptomClass: "Rust / Fungal Infection",
        name: "Asian Soybean Rust",
        causeType: "Fungal",
        causalAgent: "Phakopsora pachyrhizi",
        coreCause: "Rust spores move long distances and explode when soybean leaves stay humid.",
        identification: ["Tiny tan to reddish lesions with pustules below", "Rapid upward spread when untreated"],
        triggers: ["Humid nights and cloudy weather", "Late scouting"],
        immediateActions: ["Scout lower canopy first", "Move quickly when pustules are active"],
        prevention: ["Use regional advisories", "Rotate fungicide modes of action"],
        marketRisk: "Soybean rust can strip yield potential before seed fill ends.",
      }),
      disease({
        id: "soybean-iron-chlorosis",
        symptomClass: "Mild Leaf Stress",
        name: "Soybean Iron Chlorosis Stress",
        causeType: "Nutrient",
        causalAgent: "Iron unavailability in high-pH soils",
        coreCause: "Iron is present in the soil but inaccessible to roots in alkaline or saturated conditions.",
        identification: ["Young leaves turn yellow while veins stay green", "Plants stay stunted in patches"],
        triggers: ["High-pH soils", "Poor root aeration"],
        immediateActions: ["Map the affected zones", "Treat as a soil and root issue first"],
        prevention: ["Manage pH-related fields carefully", "Choose tolerant varieties"],
        marketRisk: "Persistent chlorosis cuts canopy growth and seed yield.",
      }),
    ],
  },
  {
    id: "tomato",
    name: "Tomato",
    scientificName: "Solanum lycopersicum",
    category: "Vegetable",
    aliases: ["Tamatar"],
    summary: "Tomato needs crop-specific naming because blights, spots, and nutrient stress can look similar early.",
    primaryMarkets: ["Retail market", "Processing buyers", "Supermarket procurement", "Direct farm sale"],
    schemeTags: ["income", "insurance", "market", "soil", "horticulture", "credit", "organic"],
    healthSignals: ["Firm green leaves", "No concentric spots", "No water-soaked blight patches"],
    diseaseGuide: [
      disease({
        id: "tomato-septoria",
        symptomClass: "Leaf Spot Symptoms Detected",
        name: "Tomato Septoria Leaf Spot",
        causeType: "Fungal",
        causalAgent: "Septoria lycopersici",
        coreCause: "Old residue, splashing water, and prolonged humidity feed Septoria cycles.",
        identification: ["Small round lesions with pale centers", "Lower leaves yellow and drop first"],
        triggers: ["Overhead irrigation", "Warm humid weather"],
        immediateActions: ["Remove lower infected foliage", "Keep leaves dry as much as possible"],
        prevention: ["Stake or prune for airflow", "Rotate away from residue pressure"],
        marketRisk: "Defoliation exposes fruit and lowers shelf quality.",
      }),
      disease({
        id: "tomato-late-blight",
        symptomClass: "Bacterial Blight / Late Blight",
        name: "Tomato Late Blight",
        causeType: "Oomycete",
        causalAgent: "Phytophthora infestans",
        coreCause: "Cool wet conditions allow late blight to move through leaves and fruit at outbreak speed.",
        identification: ["Water-soaked dark lesions", "White growth may appear on lesion edges"],
        triggers: ["Cool wet nights", "Nearby infected inoculum"],
        immediateActions: ["Act immediately on hotspots", "Protect healthy plants quickly"],
        prevention: ["Use preventive scouting after cool rain", "Start with clean transplants"],
        marketRisk: "Late blight can wipe out marketable yield fast.",
      }),
      disease({
        id: "tomato-leaf-mold",
        symptomClass: "Rust / Fungal Infection",
        name: "Tomato Leaf Mold",
        causeType: "Fungal",
        causalAgent: "Passalora fulva",
        coreCause: "Leaf mold is driven by long humid periods and poor airflow.",
        identification: ["Yellow patches above with olive mold below", "Lower leaves show symptoms first"],
        triggers: ["Poor ventilation", "High humidity in dense foliage"],
        immediateActions: ["Increase ventilation", "Remove heavily infected lower leaves"],
        prevention: ["Space plants for airflow", "Keep protected cultivation humidity low"],
        marketRisk: "Weakens fruit size and harvest continuity.",
      }),
      disease({
        id: "tomato-stress",
        symptomClass: "Mild Leaf Stress",
        name: "Tomato Magnesium Or Nitrogen Stress",
        causeType: "Nutrient",
        causalAgent: "Imbalanced plant nutrition",
        coreCause: "Tomato shows interveinal yellowing and lower-leaf stress quickly when feeding falls out of balance.",
        identification: ["Yellowing starts between veins or on older leaves", "No clear lesion borders"],
        triggers: ["Heavy fruit load", "Uneven fertigation"],
        immediateActions: ["Check fertigation and root health", "Use tissue or water history before spraying"],
        prevention: ["Keep nutrition steady through fruiting", "Avoid root-zone salinity spikes"],
        marketRisk: "Stress lowers fruit size and color uniformity.",
      }),
    ],
  },
  {
    id: "potato",
    name: "Potato",
    scientificName: "Solanum tuberosum",
    category: "Vegetable",
    aliases: ["Aloo"],
    summary: "Potato leaf health is tightly linked to tuber protection, so blight decisions need to be fast and precise.",
    primaryMarkets: ["Wholesale market", "Cold storage network", "Processing buyers"],
    schemeTags: ["income", "insurance", "market", "soil", "horticulture", "credit"],
    healthSignals: ["Tidy green canopy", "No dark greasy lesions", "Strong haulm before senescence"],
    diseaseGuide: [
      disease({
        id: "potato-leaf-spot",
        symptomClass: "Leaf Spot Symptoms Detected",
        name: "Potato Alternaria Leaf Spot",
        causeType: "Fungal",
        causalAgent: "Alternaria solani complex",
        coreCause: "Older leaves under stress become an easy target for Alternaria spotting.",
        identification: ["Small brown lesions with target-like rings", "Lesions start on older leaves"],
        triggers: ["Nutrient stress", "Warm weather with leaf wetness"],
        immediateActions: ["Protect remaining green canopy", "Correct underlying stress where possible"],
        prevention: ["Balanced nutrition", "Field sanitation and timely scouting"],
        marketRisk: "Leaf loss reduces tuber bulking and storage performance.",
      }),
      disease({
        id: "potato-late-blight",
        symptomClass: "Bacterial Blight / Late Blight",
        name: "Potato Late Blight",
        causeType: "Oomycete",
        causalAgent: "Phytophthora infestans",
        coreCause: "Cool wet conditions make late blight the most dangerous foliar and tuber threat in potato.",
        identification: ["Dark water-soaked lesions with fast spread", "White sporulation can appear under fresh lesions"],
        triggers: ["Cool rainy weather", "Poor ventilation and infected seed tubers"],
        immediateActions: ["Remove severe hotspots", "Treat tuber protection as part of the response"],
        prevention: ["Start with clean seed", "Follow local blight alerts closely"],
        marketRisk: "Late blight causes tuber rot risk and can wipe out storage value.",
      }),
      disease({
        id: "potato-early-blight",
        symptomClass: "Rust / Fungal Infection",
        name: "Potato Early Blight",
        causeType: "Fungal",
        causalAgent: "Alternaria solani",
        coreCause: "Early blight intensifies when mature foliage faces warm conditions plus stress.",
        identification: ["Concentric ring lesions and yellow halos", "Leaf drop begins as lesions enlarge"],
        triggers: ["Warm humid weather", "Aging foliage and nutritional stress"],
        immediateActions: ["Protect green tissue while vines are still filling tubers", "Manage disease alongside crop stress"],
        prevention: ["Balanced fertility", "Crop rotation and residue breakdown"],
        marketRisk: "Shortens the green window needed for tuber bulking.",
      }),
      disease({
        id: "potato-stress",
        symptomClass: "Mild Leaf Stress",
        name: "Potato Potassium Or Moisture Stress",
        causeType: "Nutrient",
        causalAgent: "Low potassium uptake or uneven irrigation",
        coreCause: "Potato reacts quickly to root-zone imbalance with marginal burn or weak canopy tone.",
        identification: ["Leaf edges scorch or curl", "Plants stay uneven without clear pathogen signs"],
        triggers: ["Dry-down stress", "Insufficient potassium during bulking"],
        immediateActions: ["Check irrigation and fertigation uniformity", "Use stress correction before default spraying"],
        prevention: ["Keep the root zone stable", "Feed for bulking demand"],
        marketRisk: "Stress lowers tuber size distribution and storage quality.",
      }),
    ],
  },
  {
    id: "banana",
    name: "Banana",
    scientificName: "Musa acuminata",
    category: "Fruit",
    aliases: ["Kela"],
    summary: "Banana growers lose value when leaf area drops too early, so Sigatoka and wilt pressure need early action.",
    primaryMarkets: ["Wholesale fruit market", "Pack house", "Retail chains", "Ripening buyers"],
    schemeTags: ["income", "insurance", "market", "soil", "horticulture", "credit"],
    healthSignals: ["Broad intact leaves", "No Sigatoka streaking", "Strong bunch support"],
    diseaseGuide: [
      disease({
        id: "banana-sigatoka",
        symptomClass: "Leaf Spot Symptoms Detected",
        name: "Banana Sigatoka Leaf Spot",
        causeType: "Fungal",
        causalAgent: "Pseudocercospora musae",
        coreCause: "Sigatoka intensifies where large leaves stay humid and inoculum cycles freely.",
        identification: ["Yellow streaks that become brown necrotic spots", "Lesions align with leaf veins"],
        triggers: ["Humid tropical weather", "Infected older leaves left in the field"],
        immediateActions: ["Remove badly infected leaves carefully", "Protect the active leaf area for bunch fill"],
        prevention: ["Keep the plantation airy", "Follow a leaf sanitation plan"],
        marketRisk: "Leaf loss before bunch fill reduces finger size and export quality.",
      }),
      disease({
        id: "banana-wilt",
        symptomClass: "Bacterial Blight / Late Blight",
        name: "Banana Xanthomonas Wilt",
        causeType: "Bacterial",
        causalAgent: "Xanthomonas campestris pv. musacearum",
        coreCause: "Contaminated tools, insects, and infected planting material spread wilt through banana blocks.",
        identification: ["Yellowing followed by wilting and vascular discoloration", "Fruit may show bacterial ooze"],
        triggers: ["Tool transmission", "Infected suckers"],
        immediateActions: ["Disinfect tools immediately", "Rogue infected plants based on extension guidance"],
        prevention: ["Use clean planting material", "Keep field sanitation strict"],
        marketRisk: "Wilt can make bunches unmarketable and spread through whole blocks.",
      }),
      disease({
        id: "banana-black-sigatoka",
        symptomClass: "Rust / Fungal Infection",
        name: "Banana Black Sigatoka",
        causeType: "Fungal",
        causalAgent: "Pseudocercospora fijiensis",
        coreCause: "Black Sigatoka is a more aggressive foliar threat in humid banana zones.",
        identification: ["Dark streaks that enlarge into black necrotic lesions", "Rapid leaf death under pressure"],
        triggers: ["High humidity", "Continuous inoculum in dense plantations"],
        immediateActions: ["Protect the newest functional leaves", "Tighten sanitation and scouting frequency"],
        prevention: ["Maintain airflow and leaf removal discipline", "Follow resistance-aware fungicide programs"],
        marketRisk: "Can slash bunch weight and fruit finish if green leaf count collapses.",
      }),
      disease({
        id: "banana-stress",
        symptomClass: "Mild Leaf Stress",
        name: "Banana Potassium Or Water Stress",
        causeType: "Nutrient",
        causalAgent: "High potassium demand or moisture imbalance",
        coreCause: "Banana has a heavy potassium and water requirement, so stress shows early at the leaf margin.",
        identification: ["Leaf edges yellow or scorch", "Plants lose turgor and bunch fill weakens"],
        triggers: ["Irrigation gaps", "Insufficient potassium during bunch development"],
        immediateActions: ["Stabilize water supply", "Support bunch-stage nutrition based on demand"],
        prevention: ["Feed steadily through bunching", "Avoid repeated moisture shocks"],
        marketRisk: "Stress lowers bunch size and post-harvest quality.",
      }),
    ],
  },
];

export const POPULAR_CROP_IDS: CropId[] = [
  "tomato",
  "rice",
  "wheat",
  "potato",
  "banana",
  "cotton",
  "maize",
  "soybean",
];

export const TOTAL_DISEASE_PROFILES = CROP_LIBRARY.reduce((total, crop) => total + crop.diseaseGuide.length, 0);

const GOVERNMENT_SCHEMES: GovernmentScheme[] = [
  {
    id: "pm-kisan",
    title: "PM-KISAN",
    benefit: "Direct income support for eligible farmer families.",
    relevance: "Useful for seasonal cash flow before crop protection, harvesting, and transport.",
    eligibility: "Landholding farmer families subject to current scheme rules.",
    officialUrl: "https://pmkisan.gov.in/",
    sourceLabel: "PM-KISAN portal",
    tags: ["income"],
  },
  {
    id: "pmfby",
    title: "PMFBY",
    benefit: "Crop insurance support for notified crops and areas.",
    relevance: "Especially relevant when disease plus weather threatens yield or harvestable area.",
    eligibility: "Farmers growing notified crops in notified insurance areas.",
    officialUrl: "https://pmfby.gov.in/",
    sourceLabel: "PMFBY portal",
    tags: ["insurance"],
  },
  {
    id: "enam",
    title: "e-NAM",
    benefit: "Digital market access for transparent price discovery.",
    relevance: "Best fit for farmers who want direct market visibility beyond one local trader.",
    eligibility: "Farmers using participating mandis and market channels.",
    officialUrl: "https://www.enam.gov.in/web/",
    sourceLabel: "e-NAM portal",
    tags: ["market"],
  },
  {
    id: "soil-health-card",
    title: "Soil Health Card",
    benefit: "Soil testing recommendations for nutrient correction and input planning.",
    relevance: "Helpful when leaf stress may actually be nutrition, pH, or root-zone imbalance.",
    eligibility: "Farmers supported through agriculture department soil testing services.",
    officialUrl: "https://soilhealth.dac.gov.in/",
    sourceLabel: "Soil Health portal",
    tags: ["soil"],
  },
  {
    id: "pkvy",
    title: "PKVY",
    benefit: "Cluster-based support for organic and low-residue production systems.",
    relevance: "Useful for farmers targeting premium direct-sale channels with cleaner residue profiles.",
    eligibility: "Farmer groups or clusters adopting organic farming practices.",
    officialUrl: "https://pgsindia-ncof.gov.in/pkvy/Index.aspx",
    sourceLabel: "PKVY portal",
    tags: ["organic"],
  },
  {
    id: "midh",
    title: "MIDH",
    benefit: "Support for fruit, vegetable, spice, and post-harvest infrastructure.",
    relevance: "Strong fit for horticulture growers looking for pack houses, cold chain, or orchard support.",
    eligibility: "Eligible horticulture growers, groups, and institutions.",
    officialUrl: "https://midh.gov.in/",
    sourceLabel: "MIDH portal",
    tags: ["horticulture"],
  },
  {
    id: "myscheme",
    title: "myScheme Navigator",
    benefit: "One-stop government scheme discovery portal.",
    relevance: "Useful when the farmer wants more support options beyond the shortlist.",
    eligibility: "General public scheme discovery portal.",
    officialUrl: "https://www.myscheme.gov.in/",
    sourceLabel: "myScheme portal",
    tags: ["directory"],
  },
];

const MARKET_BLUEPRINTS: MarketBlueprint[] = [
  {
    id: "enam-mandi",
    title: "Search nearby e-NAM mandi",
    buyerType: "Digital mandi",
    description: "Find participating mandis where price discovery is more transparent.",
    directBenefit: "Useful when you want broader buyer visibility instead of one local middleman.",
    supports: ["Cereal", "Fiber", "Oilseed", "Vegetable", "Fruit"],
    buildQuery: (cropLabel, locationLabel) => `eNAM mandi ${cropLabel} near ${locationLabel}`,
  },
  {
    id: "wholesale-market",
    title: "Search wholesale market",
    buyerType: "Wholesale buyer",
    description: "Open the nearest bulk market query for this crop.",
    directBenefit: "Helps compare nearby market yards before committing produce.",
    supports: ["Cereal", "Fiber", "Oilseed", "Vegetable", "Fruit"],
    buildQuery: (cropLabel, locationLabel) => `${cropLabel} wholesale market near ${locationLabel}`,
  },
  {
    id: "fpo-center",
    title: "Search FPO collection center",
    buyerType: "Farmer Producer Organization",
    description: "Find farmer-group aggregation or collection points around the crop location.",
    directBenefit: "Useful for collective bargaining and transport without private commission dependence.",
    supports: ["Cereal", "Fiber", "Oilseed", "Vegetable", "Fruit"],
    buildQuery: (cropLabel, locationLabel) => `${cropLabel} FPO collection center near ${locationLabel}`,
  },
  {
    id: "processor",
    title: "Search processor or pack house",
    buyerType: "Processor or pack house",
    description: "Useful for value-added or post-harvest buyers who may pay for grade and consistency.",
    directBenefit: "Good for fruits and vegetables where storage and sorting matter.",
    supports: ["Vegetable", "Fruit"],
    buildQuery: (cropLabel, locationLabel) => `${cropLabel} processor pack house near ${locationLabel}`,
  },
  {
    id: "ginning-mill",
    title: "Search ginning or textile buyer",
    buyerType: "Fiber buyer",
    description: "Fiber crops need specialized buyers, so this query goes straight to that route.",
    directBenefit: "Helps cotton growers look beyond generic wholesale channels.",
    supports: ["Fiber"],
    buildQuery: (cropLabel, locationLabel) => `${cropLabel} ginning mill buyer near ${locationLabel}`,
  },
];

const getLocationLabel = (locationName?: string | null, coordinates?: Coordinates) => {
  if (locationName?.trim()) return locationName.trim();
  if (coordinates) return `${coordinates.lat.toFixed(2)}, ${coordinates.lon.toFixed(2)}`;
  return "your area";
};

const rankScheme = (scheme: GovernmentScheme, crop: CropProfile | null, symptomClass: DiseaseClass | null) => {
  let score = 0;
  if (scheme.tags.includes("market")) score += 5;
  if (scheme.tags.includes("income")) score += 4;
  if (crop?.schemeTags.some((tag) => scheme.tags.includes(tag))) score += 6;
  if (symptomClass && symptomClass !== "Healthy" && scheme.tags.includes("insurance")) score += 5;
  if (symptomClass === "Mild Leaf Stress" && scheme.tags.includes("soil")) score += 6;
  if ((crop?.category === "Fruit" || crop?.category === "Vegetable") && scheme.tags.includes("horticulture")) score += 5;
  if (scheme.tags.includes("directory")) score -= 2;
  return score;
};

export const getCropById = (cropId: CropId | null | undefined) =>
  cropId ? CROP_LIBRARY.find((crop) => crop.id === cropId) ?? null : null;

export const getCropSearchText = (crop: CropProfile) =>
  [crop.name, crop.scientificName, crop.category, ...crop.aliases].join(" ").toLowerCase();

export const buildCropIntelligence = ({
  crop,
  symptomClass,
  locationName,
  coordinates,
}: {
  crop: CropProfile | null;
  symptomClass: DiseaseClass | null;
  locationName?: string | null;
  coordinates?: Coordinates;
}): CropIntelligence => {
  const locationLabel = getLocationLabel(locationName, coordinates);
  const cropLabel = crop?.name ?? "crop produce";
  const primaryDisease =
    symptomClass && symptomClass !== "Healthy"
      ? crop?.diseaseGuide.find((entry) => entry.symptomClass === symptomClass) ?? GENERIC_DISEASE_GUIDE[symptomClass]
      : null;

  const watchlist = crop
    ? crop.diseaseGuide.filter((entry) => entry.id !== primaryDisease?.id).slice(0, 3)
    : Object.values(GENERIC_DISEASE_GUIDE).filter((entry) => entry.id !== primaryDisease?.id).slice(0, 3);

  const markets = MARKET_BLUEPRINTS
    .filter((blueprint) => (crop ? blueprint.supports.includes(crop.category) : blueprint.id !== "ginning-mill"))
    .slice(0, crop?.category === "Fruit" || crop?.category === "Vegetable" ? 4 : 3)
    .map((blueprint) => {
      const query = blueprint.buildQuery(cropLabel, locationLabel);
      return {
        id: blueprint.id,
        title: blueprint.title,
        buyerType: blueprint.buyerType,
        description: blueprint.description,
        directBenefit: blueprint.directBenefit,
        locationLabel,
        query,
        mapsUrl: createMapsUrl(query),
      };
    });

  const schemes = [...GOVERNMENT_SCHEMES]
    .sort((left, right) => rankScheme(right, crop, symptomClass) - rankScheme(left, crop, symptomClass))
    .slice(0, 5);

  return {
    crop,
    primaryDisease,
    watchlist,
    schemes,
    markets,
    families: WORLD_DISEASE_FAMILIES,
    coverageText: `${CROP_LIBRARY.length} crops and ${TOTAL_DISEASE_PROFILES} crop-specific disease profiles`,
    cropSpecific: Boolean(crop),
  };
};
