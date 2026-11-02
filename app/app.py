"""גמד על כתפי ענקים: ממשק Streamlit בעברית, מימין לשמאל.

הרצה: streamlit run app/app.py
"""
from __future__ import annotations

import html
import re
from pathlib import Path

import altair as alt
import pandas as pd
import streamlit as st

from data import CONTINENT_HE, FIELD_COLOR, FIELDS, ROOT, load

st.set_page_config(page_title="גמד על כתפי ענקים", layout="wide", initial_sidebar_state="collapsed")
st.markdown(f"<style>{(Path(__file__).parent / 'style.css').read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)

ICON = """<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B08A2E" stroke-width="1.75"
 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="15" r="6"/>
 <circle cx="12" cy="15" r="2.5"/><path d="M12 9V6"/><circle cx="12" cy="4" r="1.6"/></svg>"""
st.markdown(f"""<div class="topbar" role="banner">
 <a class="brand" href="./" target="_self" aria-label="דף הבית">{ICON}<span>גמד על כתפי ענקים</span></a>
 <span class="spacer"></span><span class="logo" title="כלי אישי">אד' ענת שטיבלמן A&amp;I</span></div>""",
            unsafe_allow_html=True)


def rich(text: str) -> str:
    """**bold**, ==marker==, numbers bold. Escapes everything else."""
    t = html.escape(text)
    t = re.sub(r"==(.+?)==", r"<mark>\1</mark>", t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<![\w<#/.-])(\d[\d,.]*%?)(?![\w>])", r"<b>\1</b>", t)
    return t


def md(text: str):
    st.markdown(rich(text), unsafe_allow_html=True)


def tone(kind: str, title: str, body: str):
    lines = "<br>".join(rich(x) for x in body.split("\n"))
    st.markdown(f'<div class="tone tone-{kind}"><b class="t">{html.escape(title)}</b>{lines}</div>',
                unsafe_allow_html=True)


def name_html(he, en, size="value"):
    he = html.escape(str(he)) if isinstance(he, str) and he else html.escape(str(en))
    return f'<span class="{size}">{he}</span><span class="lat">{html.escape(str(en))}</span>'


def src(url: str, label: str) -> str:
    return f'<span class="src">מקור: <a href="{html.escape(url)}" target="_blank">{html.escape(label)}</a></span>'


def age(v) -> str:
    return "-" if pd.isna(v) else str(int(v))


def stat(label: str, value: str):
    st.markdown(f'<div class="stat"><div class="label">{label}</div><div class="big">{html.escape(str(value))}</div></div>',
                unsafe_allow_html=True)


@st.cache_data
def cached():
    return load()


lau, prz, aff, edge, sel, full, cards = cached()
people = full[full.is_org == 0]
sel_df = pd.DataFrame(sel["laureates"])
sel_ids = set(sel_df.nobel_id)
field_he = {k: v[0] for k, v in FIELDS.items()}

tab_home, tab_people, tab_time, tab_lens, tab_quality = st.tabs(
    ["בית", "עשרים הזוכים", "ציר זמן", "ארבע עדשות", "איכות הנתונים"])

# ---------------------------------------------------------------- home
with tab_home:
    st.markdown("""<div class="hero">
      <svg class="medal" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#B08A2E" stroke-width=".6">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="4"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
      <div class="txt"><h1>ללמוד מענקים, בלי להפוך אותם לנוסחה</h1>
      <p>שלד עובדתי ממקורות פתוחים, ומעליו זיקוק אישי ליישום בתכנון העיר.</p>
      <p>דפוסים מתוארים. סיבתיות לא נטענת.</p></div></div>""", unsafe_allow_html=True)
    st.write("")
    c = st.columns(4)
    with c[0]:
        stat("זוכים ייחודיים", f"{len(lau):,}")
    with c[1]:
        stat("צמדי זוכה-פרס", f"{len(prz):,}")
    with c[2]:
        stat("נבחרים להעמקה", str(len(sel_df)))
    with c[3]:
        ready = sum(1 for k in sel_ids if k in cards and not cards[k]["problems"])
        stat("כרטיסי תובנה מאושרים", f"{ready}/{len(sel_df)}")
    st.write("")
    a, b = st.columns([3, 2])
    with a:
        st.subheader("איך עובדים עם הכלי")
        tone("neutral", "1. עובדה", "נתוני **Nobel Prize API v2.1** ו-**Wikidata**, כפי שהם.\nפערים בין המקורות מסומנים ולא מתוקנים.")
        tone("insight", "2. תובנה", "כל כרטיס מתויג: ==עובדה, הערכה או הנחה==.\nלכל הערכה יש שדה הטיה.")
        tone("solution", "3. יישום", "מה לוקחים לעבודה, עם דוגמה מהעיר.\nהכרטיס הסופי נכתב ונערך על ידי ענת.")
        women = (people.gender == "female").mean() * 100
        tone("problem", "המדגם מוטה", f"רק **{women:.1f}%** מהפרסים לאנשים הוענקו לנשים.\n"
             "אין פרס לאדריכלות או לתכנון ערים, ואין פרס לאחר המוות.")
    with b:
        st.subheader("המטאפורה")
        st.markdown('<p class="ltr">"If I have seen further it is by standing on the shoulders of Giants."</p>'
                    + src("https://en.wikipedia.org/wiki/Standing_on_the_shoulders_of_giants",
                          "Isaac Newton, מכתב לרוברט הוק, 1675"), unsafe_allow_html=True)
        md("**תובנה:** ==הכתפיים הן רשת, לא אדם אחד.==")
        st.markdown('<div class="haiku">על כתף של ענק<br>אני רואה רחוק יותר<br>אם אני זוכרת שהיא כתף</div>'
                    '<span class="src">הייקו: Claude, טיוטה לעריכה</span>', unsafe_allow_html=True)

# ---------------------------------------------------------------- people
with tab_people:
    st.subheader("עשרים זוכים, חמישה תחומים")
    md("ארבעה בכל תחום: מוקדם ומאוחר, לפחות אישה אחת, ולפחות אחד שנולד מחוץ לאירופה ולארה\"ב.")
    st.markdown(f'<span class="pill">{html.escape(sel["status"])}</span>', unsafe_allow_html=True)
    fopts = ["הכול"] + [field_he[f] for f in ["physics", "chemistry", "medicine", "economics", "peace"]]
    fchoice = st.radio("תחום", fopts, horizontal=True, label_visibility="collapsed", key="pfield")
    show = sel_df if fchoice == "הכול" else sel_df[sel_df.field.map(field_he) == fchoice]
    if "chosen" not in st.session_state:
        st.session_state.chosen = sel_df.nobel_id.iloc[0]
    cols = st.columns(4)
    for i, (_, s) in enumerate(show.iterrows()):
        l = lau.set_index("nobel_id").loc[s.nobel_id]
        p = prz[(prz.nobel_id == s.nobel_id) & (prz.year == s.year)].iloc[0]
        state = "מאושר" if s.nobel_id in cards and not cards[s.nobel_id]["problems"] else "טיוטה"
        with cols[i % 4]:
            st.markdown(f"""<div class="card" style="--c:{FIELD_COLOR[s.field]}">
              <div class="meta">{field_he[s.field]} · {s.year} · גיל {age(p.age_at_award)}</div>
              <div class="nm">{html.escape(str(l.name_he or l.name_en))}</div>
              <div class="lat" style="margin:0">{html.escape(l.name_en)}</div>
              <div style="margin-top:8px"><span class="pill">כרטיס: {state}</span></div></div>""",
                        unsafe_allow_html=True)
            if st.button("לפרטים", key=f"open-{s.nobel_id}", use_container_width=True):
                st.session_state.chosen = s.nobel_id

    st.divider()
    nid = st.session_state.chosen
    s = sel_df.set_index("nobel_id").loc[nid]
    l = lau.set_index("nobel_id").loc[nid]
    p = prz[(prz.nobel_id == nid) & (prz.year == s.year)].iloc[0]
    card = cards.get(nid, {})
    st.markdown(name_html(l.name_he, l.name_en, "big"), unsafe_allow_html=True)
    st.markdown(f'<div class="meta label">{field_he[s.field]} {s.year}</div>', unsafe_allow_html=True)
    k = st.columns(4)
    with k[0]:
        stat("גיל בזכייה", age(p.age_at_award))
    with k[1]:
        stat("חלק בפרס", p.portion)
    with k[2]:
        born = f"{l.birth_city or ''}, {l.country_now or ''}".strip(", ")
        st.markdown(f'<div class="stat"><div class="label">מקום לידה (היום)</div><div class="value">{html.escape(born)}</div></div>',
                    unsafe_allow_html=True)
    with k[3]:
        others = prz[(prz.nobel_id == nid) & (prz.year != s.year)]
        more = ", ".join(f"{field_he.get(r.field, r.field)} {r.year}" for _, r in others.iterrows()) or "אין"
        st.markdown(f'<div class="stat"><div class="label">פרס נוסף</div><div class="value">{html.escape(more)}</div></div>',
                    unsafe_allow_html=True)

    left, right = st.columns([3, 2])
    with left:
        st.markdown("#### הנימוק הרשמי")
        if card.get("motivation_he"):
            md(f"**{card['motivation_he']}**")
            st.markdown('<span class="pill">תרגום, לא נוסח רשמי</span>', unsafe_allow_html=True)
        st.markdown(f'<p class="lat" style="margin:6px 0">{html.escape(p.motivation_en)}</p>'
                    + src(l.facts_url, "NobelPrize.org"), unsafe_allow_html=True)
        st.markdown("#### כרטיס התובנה")
        if card and not card["problems"]:
            tone("insight", "הרעיון", card["idea_he"])
            tone("neutral", "השיטה", card["method_he"])
            st.markdown(f'<p>"{html.escape(card["quote"])}"</p>' + src(card["quote_source"], "הרצאת נובל"),
                        unsafe_allow_html=True)
            tone("solution", f"מה לוקחים לעבודה [{card['label']}]", card["takeaway_he"])
            tone("problem", "שדה הטיה", card["bias_note"])
            if card.get("urban_example_he"):
                tone("neutral", "דוגמה מהעיר", card["urban_example_he"])
        else:
            tone("problem", "הכרטיס עוד בטיוטה", "\n".join(card.get("problems", ["אין קובץ כרטיס"])))
            path = card.get("path")
            if path:
                st.markdown(f'<span class="src">לעריכה: <code>{Path(path).relative_to(ROOT)}</code></span>',
                            unsafe_allow_html=True)
        tone("neutral", "למה נבחר/ה [הנחה]", s.why_he)
    with right:
        st.markdown("#### מוסד בזמן הזכייה")
        a_rows = aff[(aff.nobel_id == nid) & (aff.year == s.year)]
        if a_rows.empty:
            md("אין שיוך מוסדי ב-API לפרס הזה.")
        for _, a in a_rows.iterrows():
            st.markdown(f'<div class="value">{html.escape(str(a.institution))}</div>'
                        f'<div class="src">{html.escape(str(a.city))}, {html.escape(str(a.country_now))}</div>',
                        unsafe_allow_html=True)
        st.markdown("#### מנטורים ותלמידים")
        if not edge.empty:
            mine = edge[(edge.src == l.qid) | (edge.dst == l.qid)]
            if mine.empty:
                md("לא נמצאו קשרי מנחה/תלמיד ב-Wikidata.\nזה מצב כיסוי, לא עובדה על האדם.")
            for _, e in mine.iterrows():
                role = "מנחה" if e.dst == l.qid else "תלמיד/ה"
                other = (e.src_label_he, e.src_label, e.src_nobel_id) if role == "מנחה" else (e.dst_label_he, e.dst_label, e.dst_nobel_id)
                star = ' <span class="pill">זוכה נובל</span>' if isinstance(other[2], str) else ""
                st.markdown(f'<div><span class="label">{role}</span> {name_html(other[0], other[1])}{star} '
                            + src(e.source_url, e.property) + "</div>", unsafe_allow_html=True)
        st.markdown(src(l.facts_url, "עמוד העובדות") + " " + src(f"https://www.wikidata.org/wiki/{l.qid}", l.qid),
                    unsafe_allow_html=True)

# ---------------------------------------------------------------- timeline
with tab_time:
    fsel = st.radio("תחום", ["הכול"] + [field_he[f] for f in FIELDS], horizontal=True,
                    label_visibility="collapsed", key="tfield")
    d = people.dropna(subset=["age_at_award"]).copy()
    if fsel != "הכול":
        d = d[d.field.map(field_he) == fsel]
    early, late = d[d.year <= 1950].age_at_award.median(), d[d.year > 2000].age_at_award.median()
    st.subheader(f"גיל הזכייה החציוני: {early:.0f} עד 1950, {late:.0f} מאז 2001")
    md("כל נקודה היא פרס לאדם. הנקודות הגדולות הן עשרים הנבחרים.\n==הפער בין התגלית להכרה הוא חלק מהסיפור.==")
    d["תחום"] = d.field.map(field_he)
    d["שם"] = d.name_he.fillna(d.name_en)
    d["נבחר"] = d.nobel_id.isin(sel_ids)
    scale = alt.Scale(domain=[field_he[f] for f in FIELDS], range=[FIELD_COLOR[f] for f in FIELDS])
    chart = alt.Chart(d).mark_circle(opacity=.55).encode(
        x=alt.X("year:Q", title="שנת הפרס", scale=alt.Scale(domain=[1900, 2030]), axis=alt.Axis(format="d")),
        y=alt.Y("age_at_award:Q", title="גיל בזכייה (שנים)"),
        color=alt.Color("תחום:N", scale=scale, legend=alt.Legend(title="תחום", orient="top")),
        size=alt.condition("datum['נבחר']", alt.value(160), alt.value(22)),
        stroke=alt.condition("datum['נבחר']", alt.value("#1B1A17"), alt.value(None)),
        tooltip=["שם", "name_en", "תחום", "year", "age_at_award"],
    ).properties(height=440)
    trend = alt.Chart(d).transform_loess("year", "age_at_award", bandwidth=.4).mark_line(color="#1B1A17", strokeWidth=2).encode(
        x="year:Q", y="age_at_award:Q")
    st.altair_chart(chart + trend, use_container_width=True)
    tone("problem", "הטיית מדגם", "הפרס לא מוענק לאחר המוות, ולכן הכרה מאוחרת מתגמלת מי שחי זמן רב.\n"
         "העלייה בגיל אינה מוכיחה שמדע מאוחר טוב יותר.")
    st.markdown(src("https://www.nature.com/articles/508186a", "Fortunato et al., Nature 2014 (מקור מה-SPEC)"),
                unsafe_allow_html=True)

# ---------------------------------------------------------------- lenses
with tab_lens:
    lens = st.radio("עדשה", ["מנטורים", "מסלול הכרה", "מוסדות וגיאוגרפיה", "מעבר רעיונות"], horizontal=True,
                    label_visibility="collapsed", key="lens")
    if lens == "מנטורים":
        n_l = int((edge.src_nobel_id.notna() & edge.dst_nobel_id.notna()).sum()) if not edge.empty else 0
        st.subheader(f"{len(edge)} קשרי מנחה/תלמיד, {n_l} מהם בין שני זוכי נובל")
        md("קשרים מ-Wikidata (P184, P185, P1066, P802) סביב עשרים הנבחרים.")
        if not edge.empty:
            name_of = lambda q, lb, he: (he if isinstance(he, str) else lb if isinstance(lb, str) else q)
            has = [n for n in sel_df.nobel_id if lau.set_index("nobel_id").loc[n, "qid"] in set(edge.src) | set(edge.dst)]
            opts = ["קשרים בין זוכים"] + [lau.set_index("nobel_id").loc[n, "name_he"] or n for n in has]
            who = st.radio("זוכה", opts, horizontal=True, label_visibility="collapsed", key="mentor_who")
            if who == "קשרים בין זוכים":
                sub = edge[edge.src_nobel_id.notna() & edge.dst_nobel_id.notna()]
            else:
                q = lau[lau.name_he == who].qid.iloc[0]
                sub = edge[(edge.src == q) | (edge.dst == q)]
            md("למעלה: המנחים, הכתפיים. למטה: התלמידים.\n**זהב**: זוכה נובל. **מסגרת עבה**: אחד מעשרים הנבחרים.")
            lines = ['digraph G { rankdir=TB; bgcolor="transparent"; nodesep=.25; ranksep=.5;',
                     'node [shape=box, style=filled, fontname="IBM Plex Sans Hebrew", fontsize=11, margin="0.15,0.06"];',
                     'edge [color="#6F6A60", arrowsize=.6];']
            seen = set()
            for _, e in sub.iterrows():
                for qq, lb, he, nb in ((e.src, e.src_label, e.src_label_he, e.src_nobel_id),
                                       (e.dst, e.dst_label, e.dst_label_he, e.dst_nobel_id)):
                    if qq in seen:
                        continue
                    seen.add(qq)
                    fill = "#E2C77A" if isinstance(nb, str) else "#FFFFFF"
                    pen = 2.5 if nb in sel_ids else 1
                    txt = name_of(qq, lb, he).replace('"', "'")
                    lines.append(f'"{qq}" [label="{txt}", fillcolor="{fill}", penwidth={pen}];')
                lines.append(f'"{e.src}" -> "{e.dst}";')
            lines.append("}")
            st.graphviz_chart("\n".join(lines), use_container_width=False)
            st.markdown('<div class="legend"><span><i style="background:#E2C77A"></i>זוכה נובל</span>'
                        '<span><i style="background:#fff;border:1px solid #999"></i>לא זוכה</span>'
                        '<span>חץ: ממנחה לתלמיד</span></div>', unsafe_allow_html=True)
        tone("problem", "הטיית כיסוי", "Wikidata חלקי, במיוחד לפני המאה ה-20 ובשלום ובספרות.\nהיעדר קשר בגרף אינו היעדר מנטור במציאות.")
        st.markdown(src("https://doi.org/10.1007/s11192-024-04936-1", "Tol, The Nobel family, Scientometrics 2024"),
                    unsafe_allow_html=True)
    elif lens == "מסלול הכרה":
        d = people.dropna(subset=["age_at_award"]).copy()
        d["תקופה"] = pd.cut(d.year, [1900, 1950, 2000, 2100], labels=["1901-1950", "1951-2000", "2001 ואילך"])
        t = d.groupby(["field", "תקופה"], observed=True).age_at_award.median().unstack()
        t.index = t.index.map(field_he)
        jump = (t["2001 ואילך"] - t["1901-1950"]).dropna().sort_values(ascending=False)
        st.subheader(f"הקפיצה הגדולה בגיל: {jump.index[0]}, פלוס {jump.iloc[0]:.0f} שנים")
        md("גיל חציוני בזכייה לפי תחום ותקופה.\n==השאלה הפתוחה: מה קורה לרעיון בשנים שבין התגלית להכרה?==")
        h = t.reset_index().melt(id_vars="field", var_name="תקופה", value_name="גיל").dropna()
        h = h.rename(columns={"field": "תחום"})
        base = alt.Chart(h).encode(x=alt.X("תקופה:N", title=None, sort=None, axis=alt.Axis(labelAngle=0)),
                                   y=alt.Y("תחום:N", title=None))
        heat = base.mark_rect().encode(color=alt.Color("גיל:Q", scale=alt.Scale(scheme="goldorange"),
                                                       legend=alt.Legend(title="גיל חציוני")))
        txt = base.mark_text(fontWeight="bold", fontSize=14).encode(text=alt.Text("גיל:Q", format=".0f"))
        st.altair_chart((heat + txt).properties(height=260), use_container_width=True)
        tone("problem", "הטיה", "גיל בזכייה אינו גיל התגלית. הפער ביניהם דורש נתון נוסף (מאמר הפרס) שעוד לא נאסף.")
        st.markdown(src("https://www.pnas.org/doi/10.1073/pnas.1102895108", "Jones & Weinberg, PNAS 2011 (מקור מה-SPEC)"),
                    unsafe_allow_html=True)
    elif lens == "מוסדות וגיאוגרפיה":
        share = people.continent.value_counts(normalize=True) * 100
        st.subheader(f"{share.iloc[0]:.0f}% מהפרסים לאנשים: נולדו ב{CONTINENT_HE.get(share.index[0], share.index[0])}")
        md("מקום הלידה לפי גבולות היום (countryNow). זהב: עשרים הנבחרים.")
        m = lau[(lau.is_org == 0)].dropna(subset=["birth_lat", "birth_lon"]).copy()
        m["color"] = m.nobel_id.map(lambda x: "#B08A2EEE" if x in sel_ids else "#2F5D8A55")
        m["size"] = m.nobel_id.map(lambda x: 90000 if x in sel_ids else 30000)
        st.map(m, latitude="birth_lat", longitude="birth_lon", color="color", size="size")
        st.markdown('<div class="legend"><span><i style="background:#B08A2E"></i>עשרים הנבחרים</span>'
                    '<span><i style="background:#2F5D8A88"></i>כל שאר הזוכים</span>'
                    '<span>נקודה: עיר לידה</span></div>', unsafe_allow_html=True)
        aff_top = aff.groupby("institution_now").nobel_id.nunique().sort_values(ascending=False).head(10)
        st.markdown("#### עשרת המוסדות עם הכי הרבה זוכים בזמן הזכייה")
        bars = alt.Chart(aff_top.rename("זוכים").reset_index()).mark_bar(color="#2F5D8A").encode(
            x=alt.X("זוכים:Q", title="זוכים ייחודיים"),
            y=alt.Y("institution_now:N", sort="-x", title=None, axis=alt.Axis(labelLimit=320)))
        st.altair_chart(bars.properties(height=300), use_container_width=True)
        tone("problem", "הטיה", "המוסד הוא השיוך ביום הזכייה, לא המקום שבו נעשתה התגלית.\nשמות מוסדות עוד לא אוחדו לפי ROR.")
    else:
        st.subheader("מעבר רעיונות: עוד לא נאסף")
        tone("neutral", "מה חסר", "השלב הזה דורש מאמרי פרס מ-OpenAlex, אחרי אימות ידני של כל מאמר.\n"
             "בלי אימות, OpenAlex עלול לשייך מאמר לזוכה הלא נכון.")
        tone("solution", "הצעד הבא", "לבחור לכל אחד מעשרים הנבחרים את מאמר הפרס (DOI), ולסמן is_prize_work.")
        st.markdown(src("https://www.pnas.org/doi/10.1073/pnas.1424329112", "Ke et al., PNAS 2015 (מקור מה-SPEC)"),
                    unsafe_allow_html=True)

# ---------------------------------------------------------------- quality
with tab_quality:
    rep = ROOT / "docs" / "QUALITY_REPORT.md"
    st.markdown(rep.read_text(encoding="utf-8") if rep.exists() else "הרץ את scripts/quality_checks.py")
