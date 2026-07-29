-- TrailMate — waiver template v1 (FR-5.2)
--
-- ⚠️  PLACEHOLDER TEXT. SDS §9.4: "Have a lawyer review the waiver template and ToS
-- before launch — this is the single most important legal spend." Do not ship this
-- wording. Replace it by inserting version 2 (never by editing this row) so every
-- already-signed record still resolves to the exact text its signer agreed to.

insert into public.waiver_templates (version, jurisdiction, effective_from, body_md)
values (
  1,
  'US',
  now(),
  $waiver$
# Release of Liability, Waiver of Claims, and Assumption of Risk

**DRAFT — PENDING LEGAL REVIEW. NOT FOR PRODUCTION USE.**

In consideration of being permitted to participate in the hike described in my booking
(the "Activity"), I acknowledge and agree as follows.

## 1. Assumption of risk

I understand that hiking and backcountry travel carry inherent risks that cannot be
eliminated, including but not limited to: falls on uneven or loose terrain; rockfall;
stream and river crossings; sudden or severe weather; lightning; extreme heat or cold;
altitude illness; dehydration; getting lost; encounters with wildlife or insects; contact
with poisonous plants; exposure to communicable disease; delayed emergency response due to
remote location or absence of mobile coverage; and the acts or omissions of other
participants. I voluntarily assume all such risks, both known and unknown.

## 2. Fitness and preparation

I confirm that I am at least 18 years of age. I confirm that I am physically capable of
completing the Activity as described in the listing, including its stated distance,
elevation gain, and expected duration, and that I have disclosed to the organizer any
medical condition that could affect my safety or the safety of others. I will bring the
gear listed as required for the Activity.

## 3. Release and waiver

To the fullest extent permitted by law, I release, waive, and discharge the hike
organizer, TrailMate (the platform operator), and their respective officers, employees,
agents, and contractors (collectively, the "Released Parties") from any and all claims,
demands, or causes of action arising out of or related to any loss, damage, illness, or
injury, including death, that I may suffer in connection with the Activity.

**This release does not apply to gross negligence, recklessness, or willful misconduct,
and nothing in this document limits any right that cannot be waived under applicable law.**

## 4. Independent organizers

I understand that TrailMate operates a marketplace. Hikes are planned, led, and
controlled by independent organizers, not by TrailMate. TrailMate does not lead hikes,
supervise participants, or verify route conditions.

## 5. Emergency care

I authorize the Released Parties to arrange emergency medical treatment on my behalf if I
am unable to consent, and I accept financial responsibility for the cost of that
treatment and of any evacuation.

## 6. Media

I grant the Released Parties permission to use photographs and video in which I appear,
captured during the Activity, for the purpose of documenting and promoting the Activity,
unless I withdraw this permission in writing.

## 7. Governing law and severability

This agreement is governed by the laws of the launch jurisdiction identified in the
platform's Terms of Service. If any provision is held unenforceable, the remaining
provisions stay in full force.

## 8. Acknowledgement

I have read this document in full. I understand that I am giving up substantial legal
rights, including the right to sue. I sign it freely and voluntarily.
$waiver$
)
on conflict (version) do nothing;
