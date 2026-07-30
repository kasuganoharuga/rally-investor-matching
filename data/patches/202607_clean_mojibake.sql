BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.clean_mojibake(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    cleaned text := input_text;
    pair text[];
    replacements text[][] := ARRAY[
        ARRAY['fa莽ades', 'façades'],
        ARRAY['鈥檚', '''s'],
        ARRAY['Arax璋?', 'Araxá '],
        ARRAY['Arax璋 ', 'Araxá '],
        ARRAY['Mt Henry鈥揝elene', 'Mt Henry-Selene'],
        ARRAY['Napi閼?', 'Napié '],
        ARRAY['Napi閼 ', 'Napié '],
        ARRAY['C娑斿澅e d''Ivoire', 'Côte d''Ivoire'],
        ARRAY['stress闁炽儲鍚卹ee', 'stress-free'],
        ARRAY['闂佺偨鍎查悰?', '''s '],
        ARRAY['闂佺偨鍎查悰 ', '''s '],
        ARRAY['闂傚倷鑳堕崑銊╁磿閺屻儲鍋?', '''s '],
        ARRAY['闂傚倷鑳堕崑銊╁磿閺屻儲鍋 ', '''s '],
        ARRAY['闂傚倸鍊烽懗鍫曞磻閵娾晛纾块柡灞诲劜閸?', '''s '],
        ARRAY['闂傚倸鍊烽懗鍫曞磻閵娾晛纾块柡灞诲劜閸 ', '''s '],
        ARRAY['闁炽儲鐛?', '''s '],
        ARRAY['闁炽儲鐛 ', '''s '],
        ARRAY['闂備胶鍋ㄩ崕鏌ユ偘?', '''s '],
        ARRAY['闂備胶鍋ㄩ崕鏌ユ偘 ', '''s '],
        ARRAY['闁炽儲銈碢I闁?', 'NPI)'],
        ARRAY['闁炽儲銈碢I闁 ', 'NPI)'],
        ARRAY['Zelira Therapeutics鈥?HOPE', 'Zelira Therapeutics'' HOPE'],
        ARRAY['Zelira Therapeutics鈥 HOPE', 'Zelira Therapeutics'' HOPE'],
        ARRAY['organic琛屼笟', 'organic industry'],
        ARRAY['Fras茅', 'Frase'],
        ARRAY['CO鈧?storage', 'CO2 storage'],
        ARRAY['CO鈧 storage', 'CO2 storage'],
        ARRAY['software鈥攖rusted', 'software - trusted'],
        ARRAY['聽', ' '],
        ARRAY['parents鈥?mental', 'parents'' mental'],
        ARRAY['parents鈥 mental', 'parents'' mental'],
        ARRAY['career鈥慴uilding', 'career-building'],
        ARRAY['project 鈥?16', 'project - 16'],
        ARRAY['project 鈥 16', 'project - 16'],
        ARRAY['stress鈥慺ree', 'stress-free'],
        ARRAY['tradies 鈥?answers', 'tradies - answers'],
        ARRAY['tradies 鈥 answers', 'tradies - answers'],
        ARRAY['aged 4鈥?2', 'aged 4-12'],
        ARRAY['aged 4鈥 2', 'aged 4-12'],
        ARRAY['Pf盲ffikon', 'Pfäffikon'],
        ARRAY['Co鏋歱eratieve', 'Coöperatieve'],
        ARRAY['脦le-de-France', 'Île-de-France'],
        ARRAY['Saint-Maur-des-Foss茅s', 'Saint-Maur-des-Fossés'],
        ARRAY['Manawat奴-Whanganui', 'Manawatū-Whanganui'],
        ARRAY['Australia閳ユ獨', 'Australia''s'],
        ARRAY['Wildfire閳ユ獨', 'Wildfire''s'],
        ARRAY['Ingham閳ユ獨', 'Ingham''s'],
        ARRAY['Lloyd閳ユ獨', 'Lloyd''s'],
        ARRAY['B眉rk', 'Bürk'],
        ARRAY['鈧?00m', 'EUR 200m'],
        ARRAY['鈧 00m', 'EUR 200m'],
        ARRAY['閳ユ竵nd閳?', '''and'' '],
        ARRAY['閳ユ竵nd閳 ', '''and'' '],
        ARRAY['Aidacare闁炽儲鐛?', 'Aidacare''s '],
        ARRAY['Aidacare闁炽儲鐛 ', 'Aidacare''s '],
        ARRAY['Qu鑼卋ec', 'Québec'],
        ARRAY['Soci閼煎嵓閼?G閼煎崿閼煎嵐ale', 'Société Générale'],
        ARRAY['Soci閼煎嵓閼 G閼煎崿閼煎嵐ale', 'Société Générale']
    ];
BEGIN
    IF cleaned IS NULL THEN
        RETURN NULL;
    END IF;

    FOREACH pair SLICE 1 IN ARRAY replacements LOOP
        cleaned := replace(cleaned, pair[1], pair[2]);
    END LOOP;

    RETURN cleaned;
END;
$$;

UPDATE deal_investors
SET raw_name = pg_temp.clean_mojibake(raw_name)
WHERE raw_name IS DISTINCT FROM pg_temp.clean_mojibake(raw_name);

UPDATE funding_rounds
SET
    investee_name_raw = pg_temp.clean_mojibake(investee_name_raw),
    investor_names_raw = pg_temp.clean_mojibake(investor_names_raw),
    source_payload = pg_temp.clean_mojibake(source_payload::text)::jsonb
WHERE
    investee_name_raw IS DISTINCT FROM pg_temp.clean_mojibake(investee_name_raw)
    OR investor_names_raw IS DISTINCT FROM pg_temp.clean_mojibake(investor_names_raw)
    OR source_payload::text IS DISTINCT FROM pg_temp.clean_mojibake(source_payload::text);

UPDATE investee_company_profiles
SET company_summary = pg_temp.clean_mojibake(company_summary)
WHERE company_summary IS DISTINCT FROM pg_temp.clean_mojibake(company_summary);

UPDATE investor_team_members
SET
    first_name = pg_temp.clean_mojibake(first_name),
    last_name = pg_temp.clean_mojibake(last_name),
    bio_summary = pg_temp.clean_mojibake(bio_summary)
WHERE
    first_name IS DISTINCT FROM pg_temp.clean_mojibake(first_name)
    OR last_name IS DISTINCT FROM pg_temp.clean_mojibake(last_name)
    OR bio_summary IS DISTINCT FROM pg_temp.clean_mojibake(bio_summary);

UPDATE investor_web_profiles
SET
    claimed_thesis = pg_temp.clean_mojibake(claimed_thesis),
    contact_notes = pg_temp.clean_mojibake(contact_notes)
WHERE
    claimed_thesis IS DISTINCT FROM pg_temp.clean_mojibake(claimed_thesis)
    OR contact_notes IS DISTINCT FROM pg_temp.clean_mojibake(contact_notes);

UPDATE investors
SET
    canonical_name = pg_temp.clean_mojibake(canonical_name),
    aliases = pg_temp.clean_mojibake(aliases::text)::jsonb,
    hq_city = pg_temp.clean_mojibake(hq_city),
    hq_state = pg_temp.clean_mojibake(hq_state)
WHERE
    canonical_name IS DISTINCT FROM pg_temp.clean_mojibake(canonical_name)
    OR aliases::text IS DISTINCT FROM pg_temp.clean_mojibake(aliases::text)
    OR hq_city IS DISTINCT FROM pg_temp.clean_mojibake(hq_city)
    OR hq_state IS DISTINCT FROM pg_temp.clean_mojibake(hq_state);

UPDATE investors
SET aliases = '["Paul Little''s family office"]'::jsonb
WHERE
    id = '827fca2b-6be7-48b5-b8f3-6660133591dc'
    AND aliases IS DISTINCT FROM '["Paul Little''s family office"]'::jsonb;

UPDATE investors
SET aliases = '["St Baker''s Energy Innovation Fund"]'::jsonb
WHERE
    id = '42dc97d8-91c7-4471-bc53-3aae769c7a16'
    AND aliases IS DISTINCT FROM '["St Baker''s Energy Innovation Fund"]'::jsonb;

UPDATE matching_runs
SET founder_profile_snapshot =
    pg_temp.clean_mojibake(founder_profile_snapshot::text)::jsonb
WHERE
    id = '2f52edf1-871f-4725-83b7-9986a39a308c'
    AND founder_profile_snapshot::text IS DISTINCT FROM
        pg_temp.clean_mojibake(founder_profile_snapshot::text);

COMMIT;
