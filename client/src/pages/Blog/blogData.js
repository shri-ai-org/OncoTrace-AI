// blogData.js
export const blogPosts = [
  {
    id: 1,
    slug: 'why-we-focus-on-ctdna',
    title: 'Why We Focus on ctDNA Over CTCs',
    subtitle: 'For AI-Powered Realtime Precision Monitoring of Oncology, circulating tumor DNA offers a scientifically validated and computationally robust foundation.',
    author: 'OncoTrace-AI Research Team',
    date: '2026-08-03',
    readTime: 12,
    category: 'Research',
    tags: ['ctDNA', 'ctDNA vs CTCs', 'Liquid Biopsy', 'Precision Oncology', 'Circulating Tumor Cells', 'Minimal Residual Disease', 'Cancer Genomics', 'AI'],
    featured: true,
    metaDescription: 'Discover why ctDNA is the optimal biomarker for AI-powered realtime cancer monitoring compared to CTCs.',
    metaKeywords: 'ctDNA, circulating tumor DNA, CTCs, ctDNA vs CTCs, circulating tumor cells, liquid biopsy, precision oncology, minimal residual disease, cancer genomics, cancer monitoring, AI cancer detection',
    
    // Featured images
    images: [
      {
        src: '/blog/blog1rsc1.webp',
        width: 1366,
        height: 768,
        alt: 'Molecular structure and sequencing data visualization showing ctDNA analysis',
        caption: 'Advanced sequencing technologies enable precise detection of circulating tumor DNA fragments in blood samples',
        position: 'after-intro' // Options: 'after-intro', 'after-comparison', 'after-reasons', 'custom'
      },
      {
        src: '/blog/blog1rsc2.webp',
        width: 1400,
        height: 696,
        alt: 'AI-powered genomic analysis and tumor heterogeneity mapping',
        caption: 'Machine learning algorithms process ctDNA data to track tumor evolution and treatment response in real-time',
        position: 'after-comparison'
      }
    ],

    // Content sections
    content: {
      intro: [
        'Cancer is not a fixed disease. It evolves over time, adapts to treatment, and can develop resistance. However, many traditional monitoring methods rely on periodic imaging or invasive biopsies — approaches that provide only occasional snapshots of a constantly changing condition.',
        'As oncology moves toward precision medicine, the need for realtime molecular monitoring has become increasingly important. Liquid biopsy technologies now allow us to track cancer non-invasively using blood samples. Two key biomarkers have emerged in this space: Circulating Tumor Cells (CTCs) and Circulating Tumor DNA (ctDNA).',
        'Both have strong scientific value. However, for building an AI-Powered Realtime Precision Monitoring platform, we have chosen to focus primarily on ctDNA — a choice reflecting biological evidence, clinical validation, data compatibility with AI systems, and practical scalability.'
      ],

      sections: [
        {
          eyebrow: 'Understanding the Difference',
          title: 'Two Biomarkers, One Clear Choice',
          description: 'Both CTCs and ctDNA emerge from tumors into the bloodstream, but they differ fundamentally in their biology, measurability, and compatibility with scalable AI systems.',
          
          comparison: [
            {
              title: 'CTCs',
              subtitle: 'Intact cancer cells shed from tumors into the bloodstream',
              points: [
                'Provides tumor morphology and protein expression data',
                'Validated prognostic value in breast, prostate, colorectal cancers',
                'Extremely rare — few cells among billions of normal blood cells',
                'Requires specialized enrichment; platform variability a challenge',
                'Valuable for research but less suited for high-frequency, scalable monitoring'
              ]
            },
            {
              title: 'ctDNA',
              subtitle: 'Tumor-derived DNA fragments carrying specific genetic alterations',
              points: [
                'Somatic mutations, copy number changes, structural rearrangements',
                'Evenly distributed in plasma — quantitatively measurable',
                'Levels reflect tumor burden dynamically over time',
                'Directly compatible with AI/ML pipelines and longitudinal modeling',
                'Scalable, automatable, and standardizable across institutions'
              ]
            }
          ],

          stats: [
            { value: 'Months', label: 'Earlier relapse detection vs. radiographic imaging' },
            { value: 'Multi-site', label: 'Tumor heterogeneity represented by shed ctDNA' },
            { value: 'Realtime', label: 'Molecular surveillance enabled by quantitative ctDNA' }
          ]
        },

        {
          eyebrow: 'Scientific Rationale',
          title: 'Why ctDNA Aligns with AI-Powered Realtime Monitoring',
          description: 'Five interconnected reasons — rooted in peer-reviewed evidence — explain why ctDNA is the optimal biomarker for a continuous, AI-driven oncology monitoring platform.',
          
          reasons: [
            {
              number: '01',
              title: 'High Sensitivity for Minimal Residual Disease',
              content: [
                'ctDNA has demonstrated strong sensitivity in detecting minimal residual disease (MRD) using advanced sequencing technologies. This is critical for post-surgical monitoring and catching molecular relapse before it becomes clinically apparent.',
                'Longitudinal ctDNA analysis has also been shown to identify relapse months before radiographic progression in lung cancer, creating a window for earlier therapeutic intervention.'
              ],
              quote: 'Detectable ctDNA after surgery can predict colorectal cancer recurrence earlier than imaging — a signal that directly changes clinical decision-making.',
              citations: ['Tie et al., NEJM 2016', 'Abbosh et al., Nature 2017']
            },
            {
              number: '02',
              title: 'Quantifiable and AI-Compatible Data',
              content: [
                'AI systems require structured, numerical, and longitudinal datasets. ctDNA testing naturally produces mutation allele frequencies, time-series measurements, clonal evolution profiles, and emergence of resistance mutations.',
                'These outputs integrate directly into machine learning models for predicting recurrence risk, tracking treatment response, modeling tumor evolution, and identifying resistance patterns.'
              ],
              quote: 'CTC analysis often involves imaging, staining, and morphological interpretation — biologically informative but introducing variability when building standardized AI pipelines. ctDNA offers a directly quantifiable molecular signal.',
              citations: ['Wan et al., Nature Reviews Cancer 2017', 'Heitzer et al., Nature Reviews Genetics 2019']
            },
            {
              number: '03',
              title: 'Broader Representation of Tumor Heterogeneity',
              content: [
                'Tumors are often genetically diverse, especially in metastatic disease. A single tissue biopsy captures only one location at one time point — a fundamental limitation in understanding the full landscape of a patient\'s disease.',
                'ctDNA may reflect DNA shed from multiple tumor sites simultaneously, providing a broader molecular overview. Studies have shown that ctDNA levels correlate strongly with tumor burden and can sometimes outperform CTC enumeration in this regard.'
              ],
              quote: 'CTCs offer advantages when studying cellular behavior and metastatic potential at the single-cell level. For systemic molecular monitoring over time, ctDNA provides practical and biological advantages.',
              citations: ['Dawson et al., NEJM 2013']
            },
            {
              number: '04',
              title: 'Dynamic Monitoring of Treatment Response',
              content: [
                'ctDNA levels can change rapidly in response to therapy. A decrease may indicate effective treatment, while rising levels may suggest resistance — sometimes before imaging detects progression. This dynamic responsiveness is essential for realtime monitoring systems.',
                'Although CTC trends can also provide prognostic insight, ctDNA\'s quantitative molecular nature makes it particularly suitable for continuous tracking, predictive modeling, and adaptive treatment strategies.'
              ],
              quote: 'ctDNA monitoring has been shown to predict treatment outcomes and relapse earlier than conventional methods in lung cancer, enabling proactive rather than reactive oncology care.',
              citations: ['Chaudhuri et al., Nature 2017', 'Murtaza et al., Nature 2013']
            },
            {
              number: '05',
              title: 'Scalability and Standardization',
              content: [
                'An AI-Powered Realtime Precision Monitoring platform must be reproducible, scalable, standardized, and automation-ready. These operational requirements shape which biomarker technologies are viable at population scale.',
                'Plasma-based ctDNA workflows integrate well with automated sequencing and bioinformatics systems. CTC workflows, while powerful, often require more complex enrichment and handling processes that introduce variability across sites.'
              ],
              quote: 'For broad deployment across institutions and patient populations, operational simplicity and consistency are not secondary concerns — they are prerequisites for clinical utility.',
              citations: ['Heitzer et al., Nature Reviews Genetics 2019']
            }
          ]
        },

        {
          eyebrow: 'Looking Forward',
          title: 'The Future of Realtime Oncology Monitoring',
          content: [
            'The future of oncology will move beyond periodic imaging toward continuous molecular insight. As sequencing technologies advance and AI models mature, realtime data will increasingly guide treatment decisions. Precision oncology is not only about choosing the right therapy — it is about continuously understanding the disease as it evolves.'
          ],
          pillars: [
            {
              title: 'Earlier Detection',
              description: 'Disease progression detected at the molecular level, before clinical symptoms'
            },
            {
              title: 'Resistance Identification',
              description: 'Resistance mechanisms identified sooner, enabling timely therapeutic pivots'
            },
            {
              title: 'Dynamic Adaptation',
              description: 'Treatment strategies that adapt in realtime to evolving molecular signals'
            },
            {
              title: 'Proactive Care',
              description: 'Monitoring becomes proactive rather than reactive, shifting oncology\'s paradigm'
            }
          ]
        }
      ],

      references: [
        {
          id: 1,
          title: 'Circulating Tumor DNA Analysis Detects Minimal Residual Disease and Predicts Recurrence in Patients With Stage II Colon Cancer',
          authors: 'Tie J, et al.',
          journal: 'New England Journal of Medicine',
          year: '2016',
          url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1610013'
        },
        {
          id: 2,
          title: 'Phylogenetic ctDNA Analysis Depicts Early-Stage Lung Cancer Evolution',
          authors: 'Abbosh C, et al.',
          journal: 'Nature',
          year: '2017',
          url: 'https://www.nature.com/articles/nature22364'
        },
        {
          id: 3,
          title: 'Early Detection of Molecular Residual Disease in Localized Lung Cancer by Circulating Tumor DNA Profiling',
          authors: 'Chaudhuri AA, et al.',
          journal: 'Nature',
          year: '2017',
          url: 'https://www.nature.com/articles/nature21059'
        },
        {
          id: 4,
          title: 'Analysis of Circulating Tumor DNA to Monitor Metastatic Breast Cancer',
          authors: 'Dawson SJ, et al.',
          journal: 'New England Journal of Medicine',
          year: '2013',
          url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1213261'
        },
        {
          id: 5,
          title: 'Circulating Tumor Cells, Disease Progression, and Survival in Metastatic Breast Cancer',
          authors: 'Cristofanilli M, et al.',
          journal: 'New England Journal of Medicine',
          year: '2004',
          url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa040766'
        },
        {
          id: 6,
          title: 'Liquid Biopsies Come of Age: Towards Implementation of Circulating Tumour DNA',
          authors: 'Wan JCM, et al.',
          journal: 'Nature Reviews Cancer',
          year: '2017',
          url: 'https://www.nature.com/articles/nrc.2017.7'
        },
        {
          id: 7,
          title: 'Current and Future Perspectives of Liquid Biopsies in Genomics-Driven Oncology',
          authors: 'Heitzer E, Haque IS, Roberts CES, Speicher MR',
          journal: 'Nature Reviews Genetics',
          year: '2019',
          url: 'https://www.nature.com/articles/s41576-019-0181-3'
        },
        {
          id: 8,
          title: 'Non-Invasive Analysis of Acquired Resistance to Cancer Therapy by Sequencing of Plasma DNA',
          authors: 'Murtaza M, et al.',
          journal: 'Nature',
          year: '2013',
          url: 'https://www.nature.com/articles/nature12065'
        }
      ]
    }
  },

  {
    id: 2,
    slug: 'genomic-data-crisis',
    title: 'We Have the AI. But Where Is the Data?',
    subtitle: 'The Missing Link That Is Silently Stalling Genomic Innovation',
    author: 'OncoTrace-AI Research Team',
    date: '2026-08-26',
    readTime: 7,
    category: 'Industry Analysis',
    tags: ['Genomic Data', 'Federated Learning', 'Precision Medicine', 'Data Privacy', 'Synthetic Data', 'Data Commons', 'Genomic AI', 'Healthcare Data Sharing'],
    featured: true,
    metaDescription: "Hospitals are drowning in genomic data they can't use. Researchers can't access it. Here's why the pipeline broke — and the fixes that already exist.",
    metaKeywords: 'genomic data, federated learning, synthetic genomic data, dynamic consent, data commons, precision medicine, genomic AI, healthcare data sharing, health data privacy, HIPAA, GDPR',

    images: [
      {
        src: '/blog/dna-helix.webp',
        width: 1400,
        height: 1051,
        alt: 'Close-up render of DNA double helix strands',
        caption: "The genome can be sequenced in hours — the data it produces still struggles to reach the researchers who need it.",
        position: 'after-intro'
      },
      {
        src: '/blog/datacenter.webp',
        width: 738,
        height: 414,
        alt: 'Rows of illuminated server racks in a data center',
        caption: "Federated learning sends the AI model to each institution's own infrastructure, instead of moving sensitive records to a central server.",
        position: 'after-section-3'
      }
    ],

    content: {
      intro: [
        'Hospitals are drowning in genomic data they cannot use. Researchers are starving for data they cannot access. Somewhere in between, breakthroughs are dying.',
        "We built the most powerful AI diagnostic tools in history and sequencers that read a genome in hours. Ask a researcher for real-world, diverse, clinically validated data, though, and the answer is silence.",
        "The problem isn't the technology. It's the data pipeline that was never built to support it."
      ],

      sections: [
        {
          eyebrow: 'The Core Failure',
          title: 'The Real Problem: A Three-Way Deadlock',
          description: 'The genomic data crisis is a systemic collapse at the intersection of three interdependent systems — AI infrastructure, clinical governance, and research access — none of which can move without the other.',
          content: [
            'AI systems need data to train. Institutions need proof of safety before sharing. Researchers need access before they can provide that proof. The result is a deadlock that costs lives quietly and consistently.',
            'The Three Silent Killers:'
          ],
          pillars: [
            {
              title: 'Data Silos',
              description: 'Hospital A cannot communicate with Hospital B. Genomic datasets are isolated within institutional boundaries, duplicating research efforts and wasting hundreds of millions in funding annually.'
            },
            {
              title: 'Consent Chaos',
              description: 'Patients signed consent forms years ago that nobody can legally interpret today. Entire datasets sit unused because the legal language is too ambiguous to act on.'
            },
            {
              title: 'Diversity Drought',
              description: 'Approximately 78 percent of all genomic studies draw from European ancestry populations. The result is artificial intelligence that underperforms — and in some cases fails entirely — for patients from underrepresented backgrounds.'
            }
          ]
        },

        {
          eyebrow: 'A Human Cost',
          title: 'When Missing Data Has a Human Face',
          content: [
            'Consider a seven-year-old with a rare genetic disorder. Her physicians run every available test. The AI flags nothing — not from a flaw in the algorithm, but because her ethnic background is under two percent of its training data.',
            'The AI was not broken. It was starved.',
            'This is happening in clinics worldwide today. The gap in genomic representation is not a technical inconvenience — it is a patient safety crisis.'
          ]
        },

        {
          eyebrow: 'Root Causes',
          title: 'Why the Data Disappeared: Five Structural Failures',
          reasons: [
            {
              number: '01',
              title: 'The Fortress Institution Syndrome',
              content: [
                'Many institutions treat genomic data as a competitive asset, guarding it like proprietary research even when sharing could accelerate cures. Institutional self-preservation is one of the biggest barriers to progress.'
              ]
            },
            {
              number: '02',
              title: 'The Consent Graveyard',
              content: [
                "Millions of samples sit in biobanks under consent forms too outdated or ambiguous for research uses that didn't exist when they were signed. Legal teams won't act on them, so the data stays frozen."
              ]
            },
            {
              number: '03',
              title: 'The Diversity Blind Spot',
              content: [
                "The world's most-referenced genomic databases are predominantly Western, wealthy, and narrow. AI trained on this data carries those biases into every clinical decision it informs, wherever it's deployed."
              ]
            },
            {
              number: '04',
              title: 'The Privacy Paradox',
              content: [
                "GDPR, HIPAA, and their equivalents protect patients — and they should. But they've also built barriers that block the data sharing that could improve outcomes, with no legislated resolution to that tension."
              ]
            },
            {
              number: '05',
              title: 'The Ownership Maze',
              content: [
                'Who owns genomic data — the patient, the hospital, the sequencer maker, or the researcher? With no clear legal answer, nobody feels authorized to share it, so nobody does.'
              ]
            }
          ]
        },

        {
          eyebrow: 'The Solutions That Actually Work',
          title: 'Federated Learning: Bring the Algorithm to the Data',
          description: 'Centralizing patient data for AI training is no longer viable on privacy or legal grounds. Federated learning inverts the model: the algorithm travels to the data instead.',
          content: [
            "Each institution trains locally on its own infrastructure; only encrypted model updates, never raw data, are sent back to build a global model. Google Health has proven this across hospital networks without a single patient record leaving its home facility — no raw transfer, native HIPAA/GDPR compliance, full institutional control, and a model that grows more capable with every institution that joins."
          ]
        },

        {
          eyebrow: 'The Solutions That Actually Work',
          title: 'Synthetic Genomic Data: If You Cannot Find It, Generate It',
          description: "Synthetic data isn't fabricated data — it's privacy-preserving data, generated by models trained on real sequences, that carries real populations' statistical properties without exposing any individual patient.",
          content: [
            "Generative models — GANs and variational autoencoders — produce synthetic sequences that are mathematically valid, legally clean, and infinitely scalable, deliberately engineered to close the diversity gap current databases can't fill."
          ],
          pillars: [
            { title: 'Syntho', description: 'Synthetic health data generation at institutional scale.' },
            { title: 'MDClone', description: 'Clinical data synthesis for research environments.' },
            { title: 'Gretel.ai', description: 'Privacy-preserving data infrastructure for sensitive domains.' }
          ]
        },

        {
          eyebrow: 'The Solutions That Actually Work',
          title: 'Dynamic Consent Platforms: Let Patients Lead',
          description: "Today's consent is binary and static: one signature, signed once, governs data use indefinitely — leaving a graveyard of data nobody can legally use for anything the form didn't anticipate.",
          content: [
            'Dynamic consent replaces that signature with a living relationship: patients can expand or restrict use anytime, get notified when their data contributes to a discovery, and withdraw instantly. Trust, earned through transparency, is the most powerful data acquisition strategy there is.'
          ],
          pillars: [
            { title: 'Portable Legal Consent (PLC)', description: 'The GA4GH international standard.' },
            { title: 'Genomics England', description: 'Participant portal with active consent management.' },
            { title: 'idunn', description: 'Patient-controlled genomic consent infrastructure.' }
          ]
        },

        {
          eyebrow: 'The Solutions That Actually Work',
          title: 'Global Data Commons: Build the Infrastructure for Data to Travel',
          description: 'No single institution can solve this alone. What genomic research needs is neutral, interoperable infrastructure — data commons — where information moves across borders under clear governance.',
          content: [
            'Institutions adopt standard formats (FHIR, VCF, OMOP), access is governed by cryptographic, credential-tied permissions, and compliance is auditable. The UK Biobank linked 500,000 genomes with health records this way, producing over 7,000 published studies — shared data functioning exactly as intended.'
          ],
          pillars: [
            { title: 'Global Alliance for Genomics and Health (GA4GH)', description: '' },
            { title: 'ELIXIR', description: 'European life sciences infrastructure.' },
            { title: 'NIH All of Us Research Program', description: 'Diversity-focused national genomic cohort.' }
          ]
        },

        {
          eyebrow: 'The Solutions That Actually Work',
          title: 'Homomorphic Encryption and Blockchain Governance: Compute on Data You Cannot See',
          description: 'For the most sensitive data, homomorphic encryption lets an AI system analyze and return insights from encrypted genomic data without ever decrypting it.',
          content: [
            'Blockchain adds the governance layer: every access is recorded immutably, consent is enforced by smart contract, and patients can audit in real time who accessed their data and why. Both are operational today, not future-state aspirations.'
          ],
          pillars: [
            { title: 'Nebula Genomics', description: 'Blockchain-secured personal genomic data management.' },
            { title: 'Luna DNA', description: 'Community-owned genomic database with participant governance.' },
            { title: 'Encrypgen', description: 'Blockchain-based genomic data marketplace.' }
          ]
        },

        {
          eyebrow: 'The Path Forward',
          title: 'A Strategic Roadmap for Resolution',
          reasons: [
            {
              number: '01',
              title: 'Immediate Priority — Institutional Data Audit',
              content: [
                "Every institution should audit what genomic data it holds, what consent governs it, and what's blocking federated participation. Data that can't be inventoried can't be made useful."
              ]
            },
            {
              number: '02',
              title: 'Near-Term Priority — Federated Infrastructure and Synthetic Data Deployment',
              content: [
                'Deploy federated learning and synthetic data generation in parallel — both show measurable AI training gains within months.'
              ]
            },
            {
              number: '03',
              title: 'Medium-Term Priority — Standards Adoption and Commons Participation',
              content: [
                'Adopt interoperable data standards and join global data commons — the infrastructure already exists; the barrier is adoption, not capability.'
              ]
            },
            {
              number: '04',
              title: 'Long-Term Outcome — Precision Medicine That Works for Everyone',
              content: [
                'When diverse, high-quality data flows through trusted infrastructure, AI diagnostics trained on it perform equitably across all populations — precision medicine for the many, not the few.'
              ]
            }
          ]
        },

        {
          eyebrow: 'By The Numbers',
          title: 'The Numbers That Define the Crisis',
          stats: [
            { value: '$4.5B', label: 'Invested in genomic AI in the past year alone' },
            { value: '73%', label: 'Of hospital genomic data has never been analyzed for research purposes' },
            { value: '2%', label: 'Of major genomic database entries represent African ancestry populations' },
            { value: '17 Years', label: 'Average timeline from scientific discovery to patient treatment' },
            { value: '$1.3T', label: 'Wasted annually on pharmaceutical interventions calibrated to population averages rather than individual genomic profiles' }
          ],
          content: [
            'The resources exist. The urgency exists. The data does not flow.'
          ]
        },

        {
          eyebrow: 'Call to Action',
          title: 'What Each Stakeholder Must Do',
          pillars: [
            {
              title: 'Healthcare Institutions',
              description: "Treating genomic data as a proprietary asset must end — silos don't protect patients, they fail the ones who come next. Participation in federated networks is an obligation, not a risk to manage."
            },
            {
              title: 'Regulators and Policymakers',
              description: "Regulatory frameworks must protect patient privacy and enable data sharing simultaneously — these are not mutually exclusive. Current law treats them as if they are, and patients pay the cost."
            },
            {
              title: 'Researchers',
              description: "Datasets that don't meet basic diversity standards should not be accepted. Biased training data produces biased outputs, and the scientific community has both the authority and the responsibility to demand better."
            },
            {
              title: 'Patients',
              description: 'Genomic data has extraordinary power to advance medicine, and patients given genuine control over their data consistently choose to contribute it. Dynamic consent makes that safe — the medical community has to earn the trust to make the offer credible.'
            },
            {
              title: 'Technology Companies',
              description: "Interoperability must be the baseline, not a premium feature. The genomic data ecosystem only works when its components can communicate — proprietary lock-in here is not a competitive strategy, it is a structural impediment to progress."
            }
          ]
        },

        {
          eyebrow: 'In Closing',
          title: 'The Conclusion',
          content: [
            'The genomic revolution did not stall for lack of science or technology. It stalled because the infrastructure to move data safely, equitably, and at scale was never built with the same urgency applied to the sequencers and the algorithms.',
            'Federated learning exists. Synthetic data generation exists. Dynamic consent platforms exist. Global data commons exist. Homomorphic encryption exists. Every solution required is available today — the deficit is coordination, political will, and the institutional courage to treat data sharing as a medical imperative rather than a legal liability.',
            'The next breakthrough in genomic medicine is not waiting on a laboratory discovery. It is waiting in a database somewhere, behind a consent form nobody will sign off on and a firewall nobody will open.',
            'The question is no longer whether we have the tools to solve this — it is whether we have the will to use them. The genomic data crisis is solvable. The timeline for solving it is a choice.'
          ]
        }
      ],

      references: [
        {
          id: 1,
          title: 'The Future of Digital Health with Federated Learning',
          authors: 'Rieke N, et al.',
          journal: 'NPJ Digital Medicine',
          year: '2020',
          url: 'https://www.nature.com/articles/s41746-020-00323-1'
        },
        {
          id: 2,
          title: 'Federated Learning in Medicine: Facilitating Multi-Institutional Collaborations Without Sharing Patient Data',
          authors: 'Sheller MJ, et al.',
          journal: 'Scientific Reports',
          year: '2020',
          url: 'https://www.nature.com/articles/s41598-020-69250-1'
        },
        {
          id: 3,
          title: 'Synthea: An Approach, Method, and Software Mechanism for Generating Synthetic Patients and the Synthetic Electronic Health Care Record',
          authors: 'Walonoski J, et al.',
          journal: 'Journal of the American Medical Informatics Association',
          year: '2018',
          url: 'https://academic.oup.com/jamia/article/25/3/230/4098271'
        },
        {
          id: 4,
          title: 'Dynamic Consent: A Patient Interface for Twenty-First Century Research Networks',
          authors: 'Kaye J, et al.',
          journal: 'European Journal of Human Genetics',
          year: '2015',
          url: 'https://www.nature.com/articles/ejhg201571'
        },
        {
          id: 5,
          title: 'UK Biobank: An Open Access Resource for Identifying the Causes of a Wide Range of Complex Diseases of Middle and Old Age',
          authors: 'Sudlow C, et al.',
          journal: 'PLOS Medicine',
          year: '2015',
          url: 'https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1001779'
        },
        {
          id: 6,
          title: 'Private Genome Analysis Through Homomorphic Encryption',
          authors: 'Lauter K',
          journal: 'BMC Medical Informatics and Decision Making',
          year: '2015',
          url: 'https://bmcmedinformdecismak.biomedcentral.com/articles/10.1186/1472-6947-15-S5-S3'
        }
      ]
    }
  }

  // Add new blog posts here weekly:
  // {
  //   id: 3,
  //   slug: 'next-blog-post',
  //   title: '...',
  //   images: [...],
  //   ...
  // }
];

// Helper functions
export const getFeaturedPosts = () => blogPosts.filter(post => post.featured);
export const getPostBySlug = (slug) => blogPosts.find(post => post.slug === slug);
export const getRelatedPosts = (currentSlug, limit = 3) => {
  return blogPosts
    .filter(post => post.slug !== currentSlug)
    .slice(0, limit);
};