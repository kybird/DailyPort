import pytest
from analyzer_daily import calculate_objectives_v3

def test_data_insufficiency():
    """Returns None if history rows are less than 120."""
    history = [{"close": 1000, "high": 1100, "low": 900}] * 100
    result = calculate_objectives_v3(1000, history)
    assert result is None

def test_score_range_and_status():
    """Score should be 0-100 and status should match score."""
    # Create 150 days of flat data
    history = [{"close": 1000, "high": 1050, "low": 950}] * 150
    result = calculate_objectives_v3(1000, history)
    
    assert result is not None
    for tf in ['short', 'mid', 'long']:
        obj = result[tf]
        assert 0 <= obj['score'] <= 100
        
        if obj['score'] >= 70:
            assert obj['status'] == 'ACTIVE'
        elif obj['score'] >= 40:
            assert obj['status'] == 'WAIT'
        else:
            assert obj['status'] == 'AVOID'

def test_nullification_for_non_active():
    """Entry, stop, and target should be None for WAIT/AVOID."""
    # Bearish data to trigger AVOID
    history = [{"close": 500, "high": 550, "low": 450}] * 150
    result = calculate_objectives_v3(500, history)
    
    assert result is not None
    for tf in ['short', 'mid', 'long']:
        obj = result[tf]
        if obj['status'] != 'ACTIVE':
            assert obj['entry'] is None
            assert obj['stop'] is None
            assert obj['target'] is None

def test_deterministic_behavior():
    """Identical inputs should yield identical outputs."""
    history = [{"close": 1000, "high": 1050, "low": 950}] * 150
    res1 = calculate_objectives_v3(1000, history)
    res2 = calculate_objectives_v3(1000, history)
    assert res1 == res2
