/**
 * Biology for Computer Engineers (BOT26105), Unit IV: Microbiology and Environmental Biology.
 * Faculty-authored demo content, seeded as published. No videos yet: faculty add them in the studio.
 */
import { hook, mcq } from './biologyContentHelpers.js';

export const BIOLOGY_UNIT4 = {
  microbes: {
    curiosity:
      'There are more bacterial cells in and on your body than human cells, and most of them help you. Yet a virus, which is not even a cell, can make you very sick. What exactly is the difference?',
    curiosityQuestion: hook(
      'Why don’t antibiotics work against viral infections like the common cold?',
      [
        'Viruses are not cells and lack the structures antibiotics attack',
        'Viruses are too big for antibiotics',
        'Antibiotics only work in plants',
      ],
      0,
      'Antibiotics target bacterial cell walls, ribosomes or enzymes; viruses use the host cell’s machinery instead.',
    ),
    easy: '**Microorganisms (microbes)** are living things too small to see without a microscope. **Antonie van Leeuwenhoek** first saw them (1676); **Louis Pasteur** and **Robert Koch** proved they cause fermentation and disease.\n\nThree main groups:\n\n| | Bacteria | Fungi | Viruses |\n|---|---|---|---|\n| Cell type | Prokaryotic | Eukaryotic | **Not a cell** |\n| Size | 1–5 µm | 5–100 µm (yeast) to large moulds | 20–300 nm |\n| Example | E. coli, Lactobacillus | Yeast, Penicillium, mushroom | Influenza, HIV, SARS-CoV-2 |\n| Reproduction | Binary fission | Spores, budding | Only inside a host cell |\n\n- **Bacteria** are shaped as cocci (spheres), bacilli (rods) or spirilla (spirals).\n- **Fungi** have chitin cell walls and absorb food; they include yeasts, moulds and mushrooms.\n- **Viruses** are DNA or RNA in a protein coat (**capsid**); outside a host they are inert particles.\n\nMost microbes are **helpful**: curd, bread, antibiotics, nitrogen fixation, decomposition.',
    tenMark:
      '## Introduction\nMicrobiology is the study of microorganisms — bacteria, fungi, viruses, protozoa and algae. Microbes are found everywhere: soil, water, air and inside other organisms.\n\n## Bacteria\n- **Structure:** prokaryotic; cell wall (peptidoglycan), plasma membrane, nucleoid, plasmids, 70S ribosomes; may have capsule, flagella, pili.\n- **Shapes:** coccus (Streptococcus), bacillus (E. coli), spirillum, vibrio (Vibrio cholerae).\n- **Gram staining:** Gram-positive (thick peptidoglycan, purple) vs Gram-negative (thin wall + outer membrane, pink).\n- **Nutrition:** autotrophic (cyanobacteria) or heterotrophic.\n- **Reproduction:** binary fission; genetic exchange by conjugation, transformation, transduction.\n\n## Fungi\n- **Structure:** eukaryotic; chitin cell wall; body of **hyphae** forming a **mycelium** (moulds) or single cells (yeast).\n- **Nutrition:** heterotrophic — saprophytic (decomposers), parasitic or symbiotic (mycorrhiza, lichens).\n- **Reproduction:** budding (yeast), spores (asexual and sexual).\n- **Examples:** Saccharomyces (yeast), Penicillium, Aspergillus, Agaricus (mushroom).\n\n## Viruses\n- **Structure:** nucleic acid (DNA or RNA) + protein **capsid**; some have a lipid **envelope**.\n- **Acellular, obligate intracellular parasites:** no metabolism of their own.\n- **Replication (lytic cycle):** attachment → penetration → replication → assembly → release.\n- **Examples:** bacteriophage T4, HIV (retrovirus), influenza, SARS-CoV-2.\n\n## Comparison\n| Feature | Bacteria | Fungi | Viruses |\n|---|---|---|---|\n| Cellular | Yes (prokaryote) | Yes (eukaryote) | No |\n| Cell wall | Peptidoglycan | Chitin | None |\n| Ribosomes | 70S | 80S | None |\n| Treated by | Antibiotics | Antifungals | Antivirals, vaccines |\n\n## Importance\nBeneficial: fermentation, antibiotics, nitrogen fixation, decomposition, gut health. Harmful: diseases (TB, cholera, ringworm, COVID-19), food spoilage.\n\n## Conclusion\nMicrobes are tiny but powerful; engineering harnesses them for food, medicine and the environment.',
    realWorld:
      '- **Curd** is made by Lactobacillus; **idli and dosa batter** ferment with bacteria and yeast.\n- **Penicillin** comes from the fungus Penicillium.\n- **Bacteriophages** are being tested to kill antibiotic-resistant bacteria.\n- **Computer “viruses”** were named after biological viruses because they also need a host to copy themselves.',
    flashcards: [
      ['Who first saw microbes?', 'Antonie van Leeuwenhoek (1676).'],
      ['Three bacterial shapes?', 'Coccus (sphere), bacillus (rod), spirillum (spiral).'],
      ['Fungal cell wall is made of?', 'Chitin.'],
      [
        'Why is a virus not a cell?',
        'It has only nucleic acid in a protein coat and cannot reproduce outside a host.',
      ],
      [
        'Gram-positive vs Gram-negative?',
        'Positive: thick peptidoglycan, stains purple. Negative: thin wall + outer membrane, stains pink.',
      ],
    ],
    mcqs: [
      mcq(
        'Which is acellular?',
        [
          ['Bacteria', 'Bacteria are prokaryotic cells.'],
          ['Yeast', 'Yeast is a eukaryotic cell.'],
          ['Virus', 'Correct.'],
          ['Amoeba', 'Amoeba is a eukaryotic cell.'],
        ],
        2,
        'Viruses have no cell structure.',
      ),
      mcq(
        'Rod-shaped bacteria are called…',
        [
          ['Cocci', 'Cocci are spherical.'],
          ['Bacilli', 'Correct.'],
          ['Spirilla', 'Spirilla are spiral.'],
          ['Vibrios', 'Vibrios are comma-shaped.'],
        ],
        1,
        'E. coli is a bacillus.',
      ),
      mcq(
        'Penicillin is obtained from a…',
        [
          ['Bacterium', 'Not the source.'],
          ['Fungus', 'Correct.'],
          ['Virus', 'Viruses make nothing on their own.'],
          ['Plant', 'Not the source.'],
        ],
        1,
        'Fleming discovered it from the mould Penicillium (1928).',
      ),
      mcq(
        'The protein coat of a virus is the…',
        [
          ['Capsid', 'Correct.'],
          ['Capsule', 'A capsule is around some bacteria.'],
          ['Cell wall', 'Viruses have none.'],
          ['Hypha', 'Hyphae are fungal threads.'],
        ],
        0,
        'The capsid protects the viral genome.',
        'medium',
      ),
      mcq(
        'Gram-negative bacteria stain…',
        [
          ['Purple', 'That is Gram-positive.'],
          ['Pink/red', 'Correct.'],
          ['Green', 'Not in Gram staining.'],
          ['Do not stain', 'They take the counterstain.'],
        ],
        1,
        'Their thin wall loses crystal violet and takes up safranin.',
        'medium',
      ),
    ],
  },

  microbialGrowth: {
    curiosity:
      'One bacterium that divides every 20 minutes could, in theory, become more than 4 billion bacteria in 11 hours. Why don’t bacteria cover the Earth?',
    curiosityQuestion: hook(
      'Why does bacterial growth in a flask eventually stop?',
      [
        'Nutrients run out and toxic wastes build up',
        'Bacteria get bored',
        'Bacteria stop dividing after exactly 10 hours',
      ],
      0,
      'Limited nutrients and accumulating waste push the culture into the stationary and death phases.',
    ),
    easy: '**Microbial growth** means an increase in the **number of cells**, not their size.\n\nBacteria divide by **binary fission**: 1 → 2 → 4 → 8… The time for one doubling is the **generation time** (about 20 minutes for E. coli in good conditions).\n\nAfter *n* generations: **N = N₀ × 2ⁿ** — exponential growth, just like PCR.\n\nIn a closed flask (batch culture), growth follows a **growth curve** with four phases:\n\n1. **Lag phase** — cells adjust; no increase in number.\n2. **Log (exponential) phase** — cells divide at the maximum rate.\n3. **Stationary phase** — births = deaths; nutrients run low.\n4. **Death (decline) phase** — cells die faster than they divide.\n\nGrowth depends on **temperature, pH, oxygen, nutrients and water**.',
    tenMark:
      '## Introduction\nMicrobial growth is an orderly increase in cell number. Because microbes are tiny, growth is studied in populations.\n\n## Binary fission and generation time\nA bacterium replicates its DNA, elongates and divides into two. **Generation (doubling) time** g = t / n, where n = number of generations in time t.\nNumber of cells: **N = N₀ × 2ⁿ**; n = (log N − log N₀) / log 2.\nExample: E. coli, g ≈ 20 min; Mycobacterium tuberculosis, g ≈ 15–20 h.\n\n## Growth curve (batch culture)\n| Phase | What happens | Why |\n|---|---|---|\n| Lag | No increase in number; cells grow in size, make enzymes | Adapting to new medium |\n| Log / exponential | Constant, maximum division rate; cells most uniform | Nutrients plentiful |\n| Stationary | No net change: division = death | Nutrients depleted, wastes accumulate; secondary metabolites (antibiotics) made |\n| Death / decline | Exponential decrease in viable cells | Toxic conditions, starvation |\n\n## Factors affecting growth\n1. **Temperature:** psychrophiles (< 15 °C), mesophiles (20–45 °C, most pathogens), thermophiles (> 45 °C).\n2. **pH:** acidophiles, neutrophiles (most bacteria, pH 6.5–7.5), alkaliphiles.\n3. **Oxygen:** obligate aerobes, obligate anaerobes, facultative anaerobes.\n4. **Nutrients:** carbon, nitrogen, minerals, growth factors.\n5. **Water activity and salt:** halophiles tolerate high salt.\n\n## Measuring growth\nDirect counts (haemocytometer), viable plate counts (CFU), turbidity (optical density with a spectrophotometer), dry weight.\n\n## Continuous culture\nIn a **chemostat**, fresh medium is added and culture removed at the same rate, holding cells in the log phase — used in industry.\n\n## Conclusion\nThe growth curve guides when to harvest products: primary metabolites in the log phase, antibiotics in the stationary phase.',
    realWorld:
      '- **Refrigeration** slows microbial growth, extending food shelf life.\n- **Pasteurisation** of milk (72 °C for 15 s) kills most growing microbes.\n- **Fermenters** use sensors and control loops to keep microbes in the log phase.\n- **Exponential growth models** (N = N₀·2ⁿ) are the same maths used for epidemics and compound interest.',
    flashcards: [
      ['Four phases of the growth curve?', 'Lag, log (exponential), stationary, death.'],
      ['Generation time?', 'Time for a microbial population to double.'],
      ['Formula for cell number?', 'N = N₀ × 2ⁿ (n = number of generations).'],
      ['Phase when antibiotics are made?', 'Stationary phase (secondary metabolites).'],
      ['Mesophile?', 'A microbe that grows best at 20–45 °C.'],
    ],
    mcqs: [
      mcq(
        'Cells divide at the maximum rate in the…',
        [
          ['Lag phase', 'Cells are adjusting.'],
          ['Log phase', 'Correct.'],
          ['Stationary phase', 'Division equals death.'],
          ['Death phase', 'Cells are dying.'],
        ],
        1,
        'Exponential growth happens in the log phase.',
      ),
      mcq(
        'Starting with 100 bacteria and a 20-minute generation time, after 1 hour there will be…',
        [
          ['300', 'Growth is exponential.'],
          ['600', 'Not 2ⁿ.'],
          ['800', 'Correct.'],
          ['1600', 'That would be 4 generations.'],
        ],
        2,
        '3 generations: 100 × 2³ = 800.',
        'medium',
      ),
      mcq(
        'Most human pathogens are…',
        [
          ['Psychrophiles', 'They grow in the cold.'],
          ['Mesophiles', 'Correct.'],
          ['Thermophiles', 'They need high heat.'],
          ['Halophiles', 'They need high salt.'],
        ],
        1,
        'They grow best near body temperature, 37 °C.',
      ),
      mcq(
        'A chemostat keeps the culture in the…',
        [
          ['Lag phase', 'Not the aim.'],
          ['Log phase', 'Correct.'],
          ['Death phase', 'Not the aim.'],
          ['Stationary phase only', 'It holds growth steady at a set rate.'],
        ],
        1,
        'Continuous feeding and removal maintain exponential growth.',
        'hard',
      ),
      mcq(
        'Turbidity of a culture is measured with a…',
        [
          ['Thermometer', 'Measures temperature.'],
          ['Spectrophotometer', 'Correct.'],
          ['pH meter', 'Measures acidity.'],
          ['Barometer', 'Measures pressure.'],
        ],
        1,
        'Optical density rises as cells increase.',
        'medium',
      ),
    ],
  },

  industrialMicro: {
    curiosity:
      'A single steel tank the size of a room can make tonnes of antibiotic, vitamin or fuel every week, using microbes that cost almost nothing to feed. What happens inside that tank?',
    curiosityQuestion: hook(
      'What is a fermenter (bioreactor)?',
      [
        'A vessel that grows microbes under controlled conditions to make a product',
        'A machine that kills microbes',
        'A freezer for storing bacteria',
      ],
      0,
      'Fermenters control temperature, pH, oxygen and mixing so microbes produce the most product.',
    ),
    easy: '**Industrial microbiology** uses microbes to make products on a large scale. The key process is **fermentation**: microbes convert raw materials (sugar, starch) into useful products.\n\nIt happens in a **fermenter (bioreactor)** — a steel vessel with:\n- **Stirrer (impeller)** for mixing, **sparger** for air, **jacket** for cooling/heating,\n- **sensors** for temperature, pH, oxygen and foam, connected to a **controller**.\n\nSteps: prepare and **sterilise** the medium → add the **inoculum** (starter culture) → ferment → **downstream processing** (separate and purify the product).\n\nProducts:\n- **Food:** curd, cheese, bread, vinegar, soy sauce.\n- **Beverages and fuel:** ethanol (yeast).\n- **Medicines:** antibiotics (penicillin, streptomycin), vaccines, insulin.\n- **Chemicals:** citric acid (*Aspergillus niger*), lactic acid, vitamin B12, enzymes.',
    tenMark:
      '## Introduction\nIndustrial microbiology is the use of microorganisms to manufacture commercial products. It combines microbiology with chemical and process engineering (bioprocess engineering).\n\n## Fermentation\nIn industry, any large-scale microbial process is called fermentation (aerobic or anaerobic).\n- **Batch:** all nutrients added at the start; harvested at the end.\n- **Fed-batch:** nutrients added gradually; high yield (insulin, penicillin).\n- **Continuous:** medium added and product removed constantly.\n- **Submerged** (liquid) vs **solid-state** (solid substrate such as bran).\n\n## The fermenter (bioreactor)\n| Part | Function |\n|---|---|\n| Vessel (stainless steel) | Holds culture; withstands sterilisation |\n| Impeller / agitator | Mixes cells, nutrients and oxygen |\n| Sparger | Introduces sterile air |\n| Jacket / coils | Controls temperature |\n| Probes | Measure pH, temperature, dissolved O₂, foam |\n| Inlet/outlet ports | Add nutrients, acid/base, antifoam; take samples |\n\nTypes: stirred-tank, airlift, bubble column, packed-bed.\n\n## Stages of a fermentation process\n1. **Upstream:** strain selection and improvement, medium formulation, sterilisation, inoculum preparation.\n2. **Fermentation:** controlled growth and product formation.\n3. **Downstream processing:** cell separation (filtration, centrifugation), cell disruption, extraction, purification (chromatography), drying, packaging.\n\n## Important products\n| Product | Microbe |\n|---|---|\n| Penicillin | Penicillium chrysogenum |\n| Streptomycin | Streptomyces griseus |\n| Ethanol | Saccharomyces cerevisiae |\n| Citric acid | Aspergillus niger |\n| Lactic acid / curd | Lactobacillus |\n| Vitamin B12 | Pseudomonas, Propionibacterium |\n| Insulin | Recombinant E. coli / yeast |\n| Amylase | Bacillus, Aspergillus |\n\n## Conclusion\nIndustrial microbiology turns cheap raw materials into valuable products; engineers design, scale up and control the bioreactors that make it work.',
    realWorld:
      '- **Ethanol distilleries** in India ferment molasses with yeast for E20 petrol blending.\n- **Serum Institute of India**, the world’s largest vaccine maker by doses, runs huge bioreactors.\n- **Bioreactor automation** uses PLCs, sensors and PID control — familiar territory for engineers.\n- **Digital twins** and machine learning predict fermenter yield from sensor data.',
    flashcards: [
      [
        'Fermenter (bioreactor)?',
        'A vessel that grows microbes under controlled conditions to make a product.',
      ],
      ['Sparger?', 'The part that bubbles sterile air into the fermenter.'],
      ['Downstream processing?', 'Separating and purifying the product after fermentation.'],
      ['Microbe for citric acid?', 'Aspergillus niger.'],
      [
        'Batch vs continuous fermentation?',
        'Batch: all at once, harvested at end. Continuous: constant feed and removal.',
      ],
    ],
    mcqs: [
      mcq(
        'Ethanol is produced by fermentation using…',
        [
          ['Saccharomyces cerevisiae', 'Correct.'],
          ['Aspergillus niger', 'It makes citric acid.'],
          ['Lactobacillus', 'It makes lactic acid.'],
          ['Penicillium', 'It makes penicillin.'],
        ],
        0,
        'Brewer’s yeast converts sugar to ethanol and CO₂.',
      ),
      mcq(
        'Which part of a fermenter mixes the culture?',
        [
          ['Sparger', 'It adds air.'],
          ['Impeller', 'Correct.'],
          ['Jacket', 'It controls temperature.'],
          ['pH probe', 'It measures pH.'],
        ],
        1,
        'The impeller stirs cells, nutrients and air.',
      ),
      mcq(
        'Streptomycin is produced by…',
        [
          ['Streptomyces griseus', 'Correct.'],
          ['Streptococcus', 'A different bacterium.'],
          ['Yeast', 'Not the source.'],
          ['E. coli', 'Not the source.'],
        ],
        0,
        'Streptomyces is a soil bacterium that makes many antibiotics.',
        'medium',
      ),
      mcq(
        'Purifying the product after fermentation is called…',
        [
          ['Upstream processing', 'That is before fermentation.'],
          ['Downstream processing', 'Correct.'],
          ['Inoculation', 'That adds the starter culture.'],
          ['Sterilisation', 'That kills contaminants.'],
        ],
        1,
        'Downstream covers separation, purification and packaging.',
      ),
      mcq(
        'In fed-batch fermentation…',
        [
          ['Nothing is added after the start', 'That is batch.'],
          ['Nutrients are added gradually during the run', 'Correct.'],
          ['Product is removed continuously', 'That is continuous.'],
          ['No microbes are used', 'All fermentation uses cells.'],
        ],
        1,
        'Gradual feeding avoids substrate inhibition and raises yield.',
        'hard',
      ),
    ],
  },

  waste: {
    curiosity:
      'Indian cities produce about 1.6 lakh tonnes of solid waste every day. Kitchen waste can become cooking gas, and oil spills can be eaten by bacteria. How do microbes turn waste into resources?',
    curiosityQuestion: hook(
      'What is bioremediation?',
      [
        'Using microbes or plants to clean up pollutants',
        'Burning waste in open fields',
        'Burying plastic underground',
      ],
      0,
      'Microbes break pollutants into harmless products such as CO₂ and water.',
    ),
    easy: '**Waste management** is collecting, treating and disposing of waste safely. Waste is **biodegradable** (food, paper) or **non-biodegradable** (plastic, glass, metal, e-waste).\n\nBiological methods:\n- **Composting** — aerobic microbes turn organic waste into manure; **vermicomposting** uses earthworms.\n- **Biogas** — anaerobic digestion of cow dung or kitchen waste makes methane gas (fuel) and slurry (fertiliser).\n- **Sewage treatment** — primary (settle solids), secondary (microbes digest organic matter: activated sludge), tertiary (disinfect).\n\n**Bioremediation** uses living organisms to clean pollution:\n- **In situ** (at the site) or **ex situ** (soil/water taken away).\n- **Oil-eating bacteria** (*Pseudomonas putida*, the “superbug” engineered by Ananda Chakrabarty).\n- **Phytoremediation** — plants absorb heavy metals.\n- **Biostimulation** (add nutrients) and **bioaugmentation** (add microbes).',
    tenMark:
      '## Introduction\nWaste management is the collection, transport, treatment and disposal of waste to protect health and the environment. Biological methods use microorganisms to degrade waste cheaply and sustainably.\n\n## Types of waste\nMunicipal solid waste, sewage, industrial effluents, biomedical waste, agricultural waste, e-waste and plastic.\n\n## Solid waste management\nHierarchy: **Reduce → Reuse → Recycle → Recover energy → Dispose** (sanitary landfill).\n\n### Composting\nAerobic decomposition of organic matter by bacteria, actinomycetes and fungi; temperature rises to 55–65 °C, killing pathogens; product is humus-rich compost.\n### Vermicomposting\nEarthworms (*Eisenia fetida*) digest organic waste into vermicast.\n### Anaerobic digestion (biogas)\nStages: hydrolysis → acidogenesis → acetogenesis → **methanogenesis** (methanogens, e.g. *Methanobacterium*). Biogas ≈ 50–70% methane, 30–40% CO₂.\n\n## Sewage (wastewater) treatment\n1. **Primary:** screening, grit removal, sedimentation → primary sludge.\n2. **Secondary (biological):** aeration tanks with microbial **flocs** (activated sludge) reduce **BOD**; trickling filters.\n3. **Tertiary:** removal of nutrients, disinfection by chlorine or UV.\nSludge goes to anaerobic digesters → biogas.\n\n## Bioremediation\n| Type | Description |\n|---|---|\n| In situ | Treatment at the site (bioventing, biosparging) |\n| Ex situ | Material removed and treated (landfarming, biopiles, bioreactors) |\n| Biostimulation | Adding nutrients/oxygen to stimulate native microbes |\n| Bioaugmentation | Adding specialised microbes |\n| Phytoremediation | Plants absorb or break down pollutants (sunflower for uranium, Indian mustard for lead) |\n\nExamples: *Pseudomonas* degrades hydrocarbons (oil spills); *Deinococcus radiodurans* tolerates radiation; microbes reduce toxic Cr⁶⁺ to Cr³⁺.\n\n## Advantages and limits\nCheap, eco-friendly, on-site; but slow, and works only for biodegradable pollutants.\n\n## Conclusion\nMicrobes are nature’s recyclers; engineered biological treatment turns waste into energy, fertiliser and clean water.',
    realWorld:
      '- **Swachh Bharat Mission** promotes source segregation, composting and biogas plants.\n- **IOC’s Oilivorous-S**, an Indian bacterial product, cleans oil-contaminated soil.\n- **Sewage treatment plants** in cities use activated-sludge processes monitored by sensors.\n- **E-waste** from old computers needs safe recycling; bioleaching recovers metals from circuit boards.',
    flashcards: [
      ['Composting?', 'Aerobic microbial decomposition of organic waste into manure.'],
      ['Main gas in biogas?', 'Methane (about 50–70%).'],
      ['Bioremediation?', 'Using microbes or plants to remove or detoxify pollutants.'],
      ['Phytoremediation?', 'Using plants to absorb or break down pollutants.'],
      [
        'Secondary sewage treatment?',
        'Biological treatment where microbes digest organic matter (activated sludge), lowering BOD.',
      ],
    ],
    mcqs: [
      mcq(
        'Biogas is produced by…',
        [
          ['Aerobic bacteria', 'Biogas production is anaerobic.'],
          ['Methanogenic bacteria under anaerobic conditions', 'Correct.'],
          ['Algae in sunlight', 'Not how biogas forms.'],
          ['Burning wood', 'That is combustion.'],
        ],
        1,
        'Methanogens produce methane without oxygen.',
      ),
      mcq(
        'Using plants to clean contaminated soil is…',
        [
          ['Biomagnification', 'That is build-up of toxins in food chains.'],
          ['Phytoremediation', 'Correct.'],
          ['Biofortification', 'That adds nutrients to crops.'],
          ['Composting', 'That decomposes organic waste.'],
        ],
        1,
        'Plants absorb heavy metals or degrade organic pollutants.',
      ),
      mcq(
        'Adding nutrients to boost native microbes at a polluted site is…',
        [
          ['Bioaugmentation', 'That adds new microbes.'],
          ['Biostimulation', 'Correct.'],
          ['Incineration', 'That burns waste.'],
          ['Landfilling', 'That buries waste.'],
        ],
        1,
        'Biostimulation encourages microbes already present.',
        'medium',
      ),
      mcq(
        'The “superbug” for oil spills was developed by…',
        [
          ['Ananda Chakrabarty', 'Correct.'],
          ['Alexander Fleming', 'Fleming discovered penicillin.'],
          ['Louis Pasteur', 'Pasteur studied fermentation.'],
          ['Kary Mullis', 'Mullis invented PCR.'],
        ],
        0,
        'He engineered a Pseudomonas strain that degrades hydrocarbons (patented 1980).',
        'medium',
      ),
      mcq(
        'Activated sludge is used in which stage of sewage treatment?',
        [
          ['Primary', 'Primary is physical settling.'],
          ['Secondary', 'Correct.'],
          ['Tertiary', 'Tertiary is polishing and disinfection.'],
          ['Pre-treatment', 'That is screening.'],
        ],
        1,
        'Microbial flocs digest organic matter in aeration tanks.',
        'medium',
      ),
    ],
  },

  pollution: {
    curiosity:
      'Every winter Delhi’s air quality index crosses 400 (“severe”), and a computer you throw away can leak lead and mercury into the soil. What counts as pollution, and how is it controlled?',
    curiosityQuestion: hook(
      'Which pollutant is most closely linked to Delhi’s winter smog health warnings?',
      ['PM2.5 fine particulate matter', 'Oxygen', 'Nitrogen gas'],
      0,
      'PM2.5 particles are small enough to enter the lungs and bloodstream.',
    ),
    easy: '**Pollution** is the addition of harmful substances (**pollutants**) to the environment.\n\n- **Air pollution** — PM2.5/PM10 dust, SO₂, NOₓ, CO, ozone. Sources: vehicles, industries, crop burning. Effects: asthma, acid rain, smog. Control: **electrostatic precipitators**, scrubbers, catalytic converters, cleaner fuels (CNG).\n- **Water pollution** — sewage, industrial effluents, fertilisers. Measured by **BOD** (biochemical oxygen demand). Causes **eutrophication** (algal blooms). Control: sewage treatment, effluent treatment plants.\n- **Soil pollution** — pesticides, plastics, heavy metals.\n- **Noise pollution** — above about 85 dB damages hearing.\n- **E-waste** — discarded electronics release lead, mercury, cadmium.\n\nSome pollutants increase up the food chain — **biomagnification** (e.g. DDT, mercury).',
    tenMark:
      '## Introduction\nPollution is an undesirable change in the physical, chemical or biological characteristics of air, water or land that harms living organisms. In India, the **Central Pollution Control Board (CPCB)** monitors pollution under the Water Act (1974), Air Act (1981) and Environment Protection Act (1986).\n\n## Air pollution\n- **Pollutants:** particulate matter (PM2.5, PM10), SO₂, NOₓ, CO, O₃, hydrocarbons.\n- **Sources:** vehicles, thermal power plants, industries, stubble burning, construction dust.\n- **Effects:** respiratory disease, acid rain, smog, global warming, ozone depletion (CFCs).\n- **Control:** electrostatic precipitators, scrubbers, bag filters, catalytic converters, BS-VI fuel norms, CNG, electric vehicles.\n\n## Water pollution\n- **Sources:** domestic sewage, industrial effluents, agricultural run-off, oil spills.\n- **Indicators:** BOD, COD, dissolved oxygen, coliform count.\n- **Effects:** water-borne diseases (cholera, typhoid), **eutrophication**, fish death, **biomagnification** (Minamata disease from mercury).\n- **Control:** sewage and effluent treatment plants, zero-liquid discharge, reducing fertiliser use.\n\n## Soil pollution\nPesticides, fertilisers, plastics, heavy metals and industrial waste. Control: organic farming, biopesticides, bioremediation, proper landfills.\n\n## Noise pollution\nUnwanted sound > 80–85 dB causes hearing loss, stress. Control: silencers, barriers, zoning.\n\n## E-waste\nObsolete computers and phones contain lead, mercury, cadmium, brominated flame retardants. India’s **E-Waste (Management) Rules, 2022** enforce extended producer responsibility (EPR).\n\n## Biological indicators\nLichens indicate SO₂ levels; coliform bacteria indicate faecal contamination; high BOD indicates organic pollution.\n\n## Summary\n| Type | Key pollutant | Control |\n|---|---|---|\n| Air | PM2.5, SO₂ | ESP, scrubbers |\n| Water | Organic waste (BOD) | Sewage treatment |\n| Soil | Pesticides | Bioremediation |\n| E-waste | Heavy metals | Authorised recycling |\n\n## Conclusion\nPollution control combines laws, engineering devices and biological treatment; engineers design and monitor all three.',
    realWorld:
      '- **SAFAR and CPCB** publish real-time AQI from networks of IoT air sensors.\n- **Namami Gange** builds sewage treatment plants to clean the Ganga.\n- **Electrostatic precipitators** in thermal power plants remove over 99% of fly ash.\n- **Low-cost air-quality sensors** with Arduino or Raspberry Pi are popular engineering student projects.',
    flashcards: [
      ['PM2.5?', 'Particulate matter smaller than 2.5 µm; enters deep into the lungs.'],
      [
        'BOD?',
        'Biochemical oxygen demand: oxygen used by microbes to decompose organic matter; high BOD = polluted water.',
      ],
      [
        'Eutrophication?',
        'Nutrient enrichment of water causing algal blooms and oxygen depletion.',
      ],
      [
        'Biomagnification?',
        'Increase in concentration of a pollutant at higher levels of a food chain.',
      ],
      ['Device that removes particles from chimney gases?', 'Electrostatic precipitator.'],
    ],
    mcqs: [
      mcq(
        'High BOD in a river indicates…',
        [
          ['Clean water', 'Clean water has low BOD.'],
          ['Heavy organic pollution', 'Correct.'],
          ['High salt content', 'BOD measures organic load.'],
          ['Low temperature', 'Unrelated.'],
        ],
        1,
        'Microbes use much oxygen decomposing organic waste.',
      ),
      mcq(
        'An electrostatic precipitator removes…',
        [
          ['Particulate matter', 'Correct.'],
          ['Carbon monoxide', 'A catalytic converter handles CO.'],
          ['Noise', 'Unrelated.'],
          ['Heavy metals from water', 'It treats gases.'],
        ],
        0,
        'Charged plates attract and collect dust particles.',
      ),
      mcq(
        'Minamata disease was caused by…',
        [
          ['Lead', 'Lead causes other disorders.'],
          ['Mercury', 'Correct.'],
          ['Cadmium', 'Cadmium caused itai-itai disease.'],
          ['Fluoride', 'Fluoride causes fluorosis.'],
        ],
        1,
        'Methylmercury biomagnified in fish in Minamata Bay, Japan.',
        'medium',
      ),
      mcq(
        'Eutrophication is mainly caused by excess…',
        [
          ['Nitrates and phosphates', 'Correct.'],
          ['Oxygen', 'It depletes oxygen.'],
          ['Sand', 'Unrelated.'],
          ['Salt', 'Not the main cause.'],
        ],
        0,
        'Fertiliser run-off feeds algal blooms.',
        'medium',
      ),
      mcq(
        'Which organisms are used as indicators of SO₂ air pollution?',
        [
          ['Lichens', 'Correct.'],
          ['Earthworms', 'They indicate soil health.'],
          ['Coliforms', 'They indicate faecal water pollution.'],
          ['Mosquitoes', 'Not indicators.'],
        ],
        0,
        'Lichens disappear where SO₂ levels are high.',
        'hard',
      ),
    ],
  },

  sustainability: {
    curiosity:
      'Training one large AI model can use as much electricity as hundreds of homes do in a year. If engineering causes environmental problems, can engineering also solve them?',
    curiosityQuestion: hook(
      'What does “sustainable development” mean?',
      [
        'Meeting today’s needs without harming the ability of future generations to meet theirs',
        'Stopping all industrial growth',
        'Using resources as fast as possible',
      ],
      0,
      'The Brundtland Report (1987) defined it as development that balances present and future needs.',
    ),
    easy: '**Sustainable development** meets today’s needs **without compromising the needs of future generations** (Brundtland Report, 1987). It balances **environment, society and economy**.\n\nPractices:\n- **3 Rs — Reduce, Reuse, Recycle** (and Refuse, Repair).\n- **Renewable energy** — solar, wind, hydro, biomass, biogas.\n- **Water conservation** — rainwater harvesting, drip irrigation, wastewater reuse.\n- **Sustainable agriculture** — organic farming, biofertilisers, biopesticides, crop rotation.\n- **Green buildings** — natural light, insulation, solar panels.\n- **Circular economy** — design products to be repaired and recycled, not thrown away.\n- **Green computing** — energy-efficient data centres, longer device life, responsible e-waste recycling.\n\nThe UN set 17 **Sustainable Development Goals (SDGs)** for 2030.',
    tenMark:
      '## Introduction\nSustainable development, as defined by the Brundtland Commission (1987), is “development that meets the needs of the present without compromising the ability of future generations to meet their own needs.” It rests on three pillars: environmental protection, social equity and economic growth.\n\n## Sustainable environmental practices\n### 1. Resource conservation\nReduce, reuse, recycle; efficient use of water, energy and raw materials.\n### 2. Renewable energy\nSolar, wind, hydro, geothermal, biomass, biogas and biofuels replace fossil fuels and cut CO₂ emissions. India targets 500 GW non-fossil capacity by 2030.\n### 3. Water management\nRainwater harvesting, watershed management, drip and sprinkler irrigation, treated wastewater reuse.\n### 4. Sustainable agriculture\nOrganic farming, integrated pest management, biofertilisers (Rhizobium, Azolla), crop rotation, reduced chemical use.\n### 5. Waste management\nSegregation, composting, biogas, extended producer responsibility, circular economy.\n### 6. Afforestation and biodiversity conservation\nProtected areas, social forestry, seed banks.\n### 7. Green technology and buildings\nEnergy-efficient design, LED lighting, green building ratings (IGBC, GRIHA).\n### 8. Green computing\nEnergy-efficient hardware, server virtualisation, cloud consolidation, renewable-powered data centres, e-waste recycling.\n\n## Role of biology in sustainable engineering\n| Biological system | Sustainable solution |\n|---|---|\n| Microbes | Biofuels, bioremediation, biofertilisers |\n| Enzymes | Low-energy industrial processes |\n| Plants | Carbon capture, phytoremediation |\n| Biomimicry | Energy-efficient designs (termite-mound ventilation, lotus-leaf self-cleaning surfaces) |\n| Bioplastics | Biodegradable packaging |\n\n## Sustainable Development Goals\n17 UN SDGs, e.g. SDG 6 (clean water), SDG 7 (affordable clean energy), SDG 12 (responsible consumption), SDG 13 (climate action).\n\n## Indian initiatives\nNational Solar Mission, Swachh Bharat, Mission LiFE (Lifestyle for Environment), SATAT (compressed biogas), National Mission for a Green India.\n\n## Conclusion\nSustainability is an engineering design constraint: biology offers many of the cleanest solutions, from microbes that make fuel to nature-inspired designs.',
    realWorld:
      '- **Cochin International Airport** is the world’s first fully solar-powered airport.\n- **Biomimicry:** Zimbabwe’s Eastgate Centre is cooled like a termite mound, using about 10% of the energy of a conventional building.\n- **Green data centres** run on renewables and use AI to cut cooling energy.\n- **Mission LiFE** encourages individual sustainable habits, such as switching off idle devices.',
    flashcards: [
      [
        'Definition of sustainable development?',
        'Meeting present needs without compromising future generations’ ability to meet theirs (Brundtland, 1987).',
      ],
      ['Three pillars of sustainability?', 'Environment, society, economy.'],
      [
        'Circular economy?',
        'Keeping materials in use through repair, reuse and recycling instead of discarding.',
      ],
      ['Biomimicry?', 'Designing technology by copying solutions found in nature.'],
      ['How many UN SDGs?', '17 (target year 2030).'],
    ],
    mcqs: [
      mcq(
        'The term “sustainable development” was popularised by the…',
        [
          ['Brundtland Report', 'Correct.'],
          ['Kyoto Protocol', 'That is about emissions targets.'],
          ['Montreal Protocol', 'That is about the ozone layer.'],
          ['Paris Agreement', 'That is about climate.'],
        ],
        0,
        '“Our Common Future”, 1987.',
      ),
      mcq(
        'Which is a renewable energy source?',
        [
          ['Coal', 'Coal is fossil fuel.'],
          ['Natural gas', 'Fossil fuel.'],
          ['Solar energy', 'Correct.'],
          ['Diesel', 'Fossil fuel.'],
        ],
        2,
        'Sunlight is naturally replenished.',
      ),
      mcq(
        'Designing a building’s ventilation by copying termite mounds is an example of…',
        [
          ['Biomimicry', 'Correct.'],
          ['Bioremediation', 'That cleans pollution.'],
          ['Biomagnification', 'That is toxin build-up.'],
          ['Biofortification', 'That enriches crops.'],
        ],
        0,
        'Biomimicry copies nature’s designs.',
        'medium',
      ),
      mcq(
        'Green computing includes…',
        [
          ['Running servers at full power always', 'That wastes energy.'],
          ['Virtualisation and responsible e-waste recycling', 'Correct.'],
          ['Replacing phones every few months', 'That increases e-waste.'],
          ['Burning old circuit boards', 'That pollutes.'],
        ],
        1,
        'Efficient use and recycling reduce IT’s footprint.',
      ),
      mcq(
        'SDG 7 is about…',
        [
          ['Clean water', 'That is SDG 6.'],
          ['Affordable and clean energy', 'Correct.'],
          ['Climate action', 'That is SDG 13.'],
          ['Quality education', 'That is SDG 4.'],
        ],
        1,
        'SDG 7: ensure access to affordable, reliable, sustainable and modern energy.',
        'hard',
      ),
    ],
  },
};
