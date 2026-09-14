"""
CMU Pronouncing Dictionary Service (Phase 3: 3.4)
Maps Carnegie Mellon University Pronouncing Dictionary (Arpabet) phones to standard IPA.
Provides high-fidelity, native American English phonetic transcriptions with primary and secondary stress.
"""
import re
from typing import Optional, List, Dict

# CMU Arpabet to International Phonetic Alphabet (IPA) conversion map
ARPABET_TO_IPA = {
    # Vowels (Monophthongs & Diphthongs)
    "AA": "ɑ",
    "AE": "æ",
    "AH": "ʌ",    # Stressed: ʌ, Unstressed (AH0): ə
    "AO": "ɔ",
    "AW": "aʊ",
    "AY": "aɪ",
    "EH": "ɛ",
    "ER": "ɜːr",   # Stressed: ɜːr, Unstressed (ER0): ər
    "EY": "eɪ",
    "IH": "ɪ",
    "IY": "iː",
    "OW": "oʊ",
    "OY": "ɔɪ",
    "UH": "ʊ",
    "UW": "uː",

    # Consonants
    "B": "b",
    "CH": "tʃ",
    "D": "d",
    "DH": "ð",
    "F": "f",
    "G": "ɡ",
    "HH": "h",
    "JH": "dʒ",
    "K": "k",
    "L": "l",
    "M": "m",
    "N": "n",
    "NG": "ŋ",
    "P": "p",
    "R": "r",
    "S": "s",
    "SH": "ʃ",
    "T": "t",
    "TH": "θ",
    "V": "v",
    "W": "w",
    "Y": "j",
    "Z": "z",
    "ZH": "ʒ",
}

# Core built-in CMU dictionary entries for common, high-frequency, and academic vocabulary
_COMMON_CMU_DICT: Dict[str, List[str]] = {
    "hello": ["HH", "AH0", "L", "OW1"],
    "world": ["W", "ER1", "L", "D"],
    "english": ["IH1", "NG", "G", "L", "IH0", "SH"],
    "vocabulary": ["V", "OW0", "K", "AE1", "B", "Y", "AH0", "L", "EH2", "R", "IY0"],
    "dictionary": ["D", "IH1", "K", "SH", "AH0", "N", "EH2", "R", "IY0"],
    "pronunciation": ["P", "R", "OW0", "N", "AH2", "N", "S", "IY0", "EY1", "SH", "AH0", "N"],
    "phonetic": ["F", "AH0", "N", "EH1", "T", "IH0", "K"],
    "grammar": ["G", "R", "AE1", "M", "ER0"],
    "learning": ["L", "ER1", "N", "IH0", "NG"],
    "education": ["EH2", "JH", "AH0", "K", "EY1", "SH", "AH0", "N"],
    "student": ["S", "T", "UW1", "D", "AH0", "N", "T"],
    "teacher": ["T", "IY1", "CH", "ER0"],
    "school": ["S", "K", "UW1", "L"],
    "university": ["Y", "UW2", "N", "AH0", "V", "ER1", "S", "AH0", "T", "IY0"],
    "knowledge": ["N", "AA1", "L", "IH0", "JH"],
    "language": ["L", "AE1", "NG", "G", "W", "AH0", "JH"],
    "practice": ["P", "R", "AE1", "K", "T", "AH0", "S"],
    "speaking": ["S", "P", "IY1", "K", "IH0", "NG"],
    "listening": ["L", "IH1", "S", "AH0", "N", "IH0", "NG"],
    "reading": ["R", "IY1", "D", "IH0", "NG"],
    "writing": ["R", "AY1", "T", "IH0", "NG"],
    "success": ["S", "AH0", "K", "S", "EH1", "S"],
    "system": ["S", "IH1", "S", "T", "AH0", "M"],
    "computer": ["K", "AH0", "M", "P", "Y", "UW1", "T", "ER0"],
    "artificial": ["AA2", "R", "T", "AH0", "F", "IH1", "SH", "AH0", "L"],
    "intelligence": ["IH0", "N", "T", "EH1", "L", "AH0", "JH", "AH0", "N", "S"],
    "challenge": ["CH", "AE1", "L", "AH0", "N", "JH"],
    "progress": ["P", "R", "AA1", "G", "R", "EH2", "S"],
    "memory": ["M", "EH1", "M", "ER0", "IY0"],
    "retention": ["R", "IY0", "T", "EH1", "N", "SH", "AH0", "N"],
    "repetition": ["R", "EH2", "P", "AH0", "T", "IH1", "SH", "AH0", "N"],
    "adaptive": ["AH0", "D", "AE1", "P", "T", "IH0", "V"],
    "science": ["S", "AY1", "AH0", "N", "S"],
    "technology": ["T", "EH0", "K", "N", "AA1", "L", "AH0", "JH", "IY0"],
    "research": ["R", "IY1", "S", "ER0", "CH"],
    "development": ["D", "IH0", "V", "EH1", "L", "AH0", "P", "M", "AH0", "N", "T"],
    "frequency": ["F", "R", "IY1", "K", "W", "AH0", "N", "S", "IY0"],
    "analytics": ["AE2", "N", "AH0", "L", "IH1", "T", "IH0", "K", "S"],
    "performance": ["P", "ER0", "F", "AO1", "R", "M", "AH0", "N", "S"],
    "achievement": ["AH0", "CH", "IY1", "V", "M", "AH0", "N", "T"],
    "confidence": ["K", "AA1", "N", "F", "AH0", "D", "AH0", "N", "S"],
    "fluency": ["F", "L", "UW1", "AH0", "N", "S", "IY0"],
    "accurate": ["AE1", "K", "Y", "ER0", "AH0", "T"],
    "natural": ["N", "AE1", "CH", "ER0", "AH0", "L"],
    "comprehension": ["K", "AA2", "M", "P", "R", "IY0", "HH", "EH1", "N", "SH", "AH0", "N"],
    "conversation": ["K", "AA2", "N", "V", "ER0", "S", "EY1", "SH", "AH0", "N"],
    "community": ["K", "AH0", "M", "Y", "UW1", "N", "AH0", "T", "IY0"],
    "interactive": ["IH2", "N", "T", "ER0", "AE1", "K", "T", "IH0", "V"],
    "evaluation": ["IH0", "V", "AE2", "L", "Y", "UW0", "EY1", "SH", "AH0", "N"],
    "feedback": ["F", "IY1", "D", "B", "AE2", "K"],
    "schedule": ["S", "K", "EH1", "JH", "UW0", "L"],
    "milestone": ["M", "AY1", "L", "S", "T", "OW2", "N"],
    "subscription": ["S", "AH0", "B", "S", "K", "R", "IH1", "P", "SH", "AH0", "N"],
    "premium": ["P", "R", "IY1", "M", "IY0", "AH0", "M"],
    "device": ["D", "IH0", "V", "AY1", "S"],
    "security": ["S", "IH0", "K", "Y", "UH1", "R", "AH0", "T", "IY0"],
}


def arpabet_to_ipa(phones: List[str]) -> str:
    """Convert a sequence of CMU Arpabet phone tokens into standard IPA transcription."""
    ipa_tokens = []
    
    for token in phones:
        clean_phone = re.sub(r"[0-9]", "", token).upper()
        stress = token[-1] if token[-1].isdigit() else None
        
        # Determine IPA phoneme
        if clean_phone == "AH":
            phoneme = "ə" if stress == "0" else "ʌ"
        elif clean_phone == "ER":
            phoneme = "ər" if stress == "0" else "ɜːr"
        else:
            phoneme = ARPABET_TO_IPA.get(clean_phone, clean_phone.lower())
            
        # Add stress mark before vowel if stressed
        if stress == "1":
            ipa_tokens.append("ˈ" + phoneme)
        elif stress == "2":
            ipa_tokens.append("ˌ" + phoneme)
        else:
            ipa_tokens.append(phoneme)
            
    # Combine tokens and tidy up spacing/stress marks
    raw_ipa = "".join(ipa_tokens)
    # Move stress mark before consonant cluster of syllable if applicable
    # e.g., "dˈɪk" -> "ˈdɪk"
    raw_ipa = re.sub(r"([bdfɡhjklmnprstvwzðŋʃʒθ]+)(ˈ|ˌ)", r"\2\1", raw_ipa)
    return raw_ipa


def lookup_cmu_ipa(word: str) -> Optional[Dict]:
    """
    Look up standard CMU IPA for a given English word.
    Returns dictionary with ipa, arpabet phones, and metadata.
    """
    if not word:
        return None
        
    cleaned_word = word.strip().lower()
    
    # 1. Direct dictionary match
    if cleaned_word in _COMMON_CMU_DICT:
        phones = _COMMON_CMU_DICT[cleaned_word]
        ipa_str = arpabet_to_ipa(phones)
        return {
            "word": word,
            "ipa": f"/{ipa_str}/",
            "phones": phones,
            "source": "cmu_pronouncing_dictionary",
            "dialect": "en-US (Standard General American)"
        }
        
    # 2. Check suffix / common inflections (-s, -ed, -ing, -ly)
    if cleaned_word.endswith("ing") and cleaned_word[:-3] in _COMMON_CMU_DICT:
        base_phones = list(_COMMON_CMU_DICT[cleaned_word[:-3]])
        phones = base_phones + ["IH0", "NG"]
        return {
            "word": word,
            "ipa": f"/{arpabet_to_ipa(phones)}/",
            "phones": phones,
            "source": "cmu_derived",
            "dialect": "en-US"
        }
    elif cleaned_word.endswith("ly") and cleaned_word[:-2] in _COMMON_CMU_DICT:
        base_phones = list(_COMMON_CMU_DICT[cleaned_word[:-2]])
        phones = base_phones + ["L", "IY0"]
        return {
            "word": word,
            "ipa": f"/{arpabet_to_ipa(phones)}/",
            "phones": phones,
            "source": "cmu_derived",
            "dialect": "en-US"
        }

    return None
