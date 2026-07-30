-- Refresh investor websites and LinkedIn profiles verified on 2026-07-30.
-- This patch is intentionally scoped to existing investor records.

BEGIN;

-- The firm URL belongs on the institutional record, not the partner record.
UPDATE investors
SET
  website_url = NULL,
  updated_at = now()
WHERE canonical_name = 'Michael Gregg'
  AND deleted_at IS NULL
  AND lower(trim(trailing '/' FROM website_url)) = 'https://www.shearwater.co';

WITH verified_websites(canonical_name, website_url) AS (
  VALUES
    ('Ventures ilab Accelerator', 'https://ventures.uq.edu.au/programs/ilab-accelerator/'),
    ('Tidal Ventures', 'https://www.tidalvc.com/'),
    ('Shearwater Capital', 'https://www.shearwater.co/'),
    ('Arconic Capital', 'https://www.arconiccap.com/'),
    ('Brand Fund by Previously Unavailable', 'https://www.previously.co/brand-fund-1'),
    ('Understorey Ventures', 'https://www.understorey.ventures/'),
    ('Electrifi Ventures', 'https://www.electrifi.ventures/'),
    ('Glitch Capital', 'https://www.glitchcap.com/'),
    ('Phase One Ventures', 'https://phaseone.ventures/'),
    ('Techstars', 'https://www.techstars.com/'),
    ('Aethereum Capital', 'https://aethereum.capital/'),
    ('Shakti VC', 'https://shaktivc.com/'),
    ('The Frontier Fund', 'https://www.aera.vc/disclosure-statement/'),
    ('Marbruck Investments', 'https://www.marbruck.com/'),
    ('Soul Capital', 'https://www.soul.capital/'),
    (
      'Australian Sustainable Aviation Fuel Fund',
      'https://www.qantas.com/en-au/about-us/sustainability/climate-fund'
    ),
    ('Yara Growth Ventures', 'https://www.yaragrowthventures.com/'),
    ('Bioeconomy Science Institute', 'https://www.bioeconomyscience.co.nz/'),
    ('Foggy Valley Aotearoa', 'https://foggyvalley.nz/')
)
UPDATE investors AS investor
SET
  website_url = verified.website_url,
  updated_at = now()
FROM verified_websites AS verified
WHERE investor.canonical_name = verified.canonical_name
  AND investor.deleted_at IS NULL
  AND investor.website_url IS DISTINCT FROM verified.website_url;

WITH verified_linkedin(canonical_name, linkedin_url) AS (
  VALUES
    ('Ventures ilab Accelerator', 'https://www.linkedin.com/school/uqventures'),
    ('Giant Leap Fund', 'https://www.linkedin.com/company/giantleap-vc'),
    ('Artesian', 'https://www.linkedin.com/company/artesian-capital-management'),
    ('Rampersand', 'https://www.linkedin.com/company/rampersand'),
    ('Brisbane Angels', 'https://www.linkedin.com/company/brisbaneangels'),
    ('Flying Fox Ventures', 'https://www.linkedin.com/company/flying-fox-vc'),
    (
      'New Zealand Growth Capital Partners',
      'https://www.linkedin.com/company/new-zealand-growth-capital-partners'
    ),
    ('Clare Ventures', 'https://www.linkedin.com/company/clare-ventures'),
    ('Antipodean Capital', 'https://www.linkedin.com/company/antipodeancapital')
)
UPDATE investors AS investor
SET
  linkedin_url = verified.linkedin_url,
  updated_at = now()
FROM verified_linkedin AS verified
WHERE investor.canonical_name = verified.canonical_name
  AND investor.deleted_at IS NULL
  AND investor.linkedin_url IS DISTINCT FROM verified.linkedin_url;

-- This value was copied from an investee announcement, not TreeArc's profile.
UPDATE investors
SET
  linkedin_url = NULL,
  updated_at = now()
WHERE canonical_name = 'TreeArc Investment Group'
  AND deleted_at IS NULL
  AND lower(trim(trailing '/' FROM linkedin_url)) =
    'https://www.linkedin.com/company/mako-aero';

COMMIT;
