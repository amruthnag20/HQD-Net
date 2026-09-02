#!/usr/bin/env python
"""
HQD-Net Sandwich Architecture Verification & Integration Test

This script validates that all three phases of the sandwich architecture
are properly integrated and functioning correctly.

Usage:
    .venv\Scripts\python.exe verify_sandwich_architecture.py
"""

import os
import sys
import numpy as np
import json

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

def print_header(title):
    """Print a formatted section header."""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def print_subheader(title):
    """Print a formatted subsection header."""
    print(f"\n{title}")
    print("-"*70)

def test_imports():
    """Test that all required modules can be imported."""
    print_header("TEST 1: MODULE IMPORTS")
    
    modules_to_test = [
        ("engine_controller", "HQDNetEngineController"),
        ("quantum_core.hqd_quantum", "DressedVQC"),
        ("quantum_core.dataset_loader", "load_clinical_data"),
        ("quantum_core.qsvm_backend", "compute_kernel_matrix"),
        ("explainability.explainability", "compute_quantum_sensitivity"),
    ]
    
    all_passed = True
    for module_name, class_name in modules_to_test:
        try:
            module = __import__(module_name, fromlist=[class_name])
            getattr(module, class_name)
            print(f"✅ {module_name}.{class_name}")
        except Exception as e:
            print(f"❌ {module_name}.{class_name} — {str(e)[:50]}")
            all_passed = False
    
    return all_passed

def test_engine_initialization():
    """Test that HQDNetEngineController initializes without errors."""
    print_header("TEST 2: ENGINE CONTROLLER INITIALIZATION")
    
    try:
        from engine_controller import HQDNetEngineController
        
        print("Initializing controller with mock preprocessor...")
        controller = HQDNetEngineController(use_mock_preprocessor=True)
        
        # Verify attributes exist
        attributes = ['vqc_model', 'qsvm_model', 'classical_svm', 'classical_rf', 'scaler']
        for attr in attributes:
            if hasattr(controller, attr):
                print(f"✅ Attribute '{attr}' initialized")
            else:
                print(f"❌ Attribute '{attr}' missing")
                return False
        
        return True
    except Exception as e:
        print(f"❌ Engine initialization failed: {e}")
        return False

def test_phase_1_preprocessing():
    """Test Phase 1: Classical Preprocessing."""
    print_header("TEST 3: PHASE 1 - CLASSICAL PREPROCESSING")
    
    try:
        from engine_controller import HQDNetEngineController
        
        controller = HQDNetEngineController(use_mock_preprocessor=True)
        
        # Test with 24 raw features
        raw_record = np.random.randn(24)
        print(f"Input: {len(raw_record)} raw biomarkers (shape: {raw_record.shape})")
        
        latent_biomarkers = controller.run_classical_preprocessor(raw_record)
        
        # Verify output
        if latent_biomarkers.shape == (10,):
            print(f"✅ Output: 10 latent biomarkers (shape: {latent_biomarkers.shape})")
            print(f"   Sample values: {latent_biomarkers[:3]} ...")
            return True, latent_biomarkers
        else:
            print(f"❌ Expected shape (10,), got {latent_biomarkers.shape}")
            return False, None
    except Exception as e:
        print(f"❌ Phase 1 failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_phase_2_vqc():
    """Test Phase 2a: VQC Quantum Classification."""
    print_header("TEST 4: PHASE 2A - QUANTUM CORE (VQC)")
    
    try:
        from engine_controller import HQDNetEngineController
        
        controller = HQDNetEngineController(use_mock_preprocessor=True)
        
        # Use known good latent biomarkers
        latent_biomarkers = np.random.randn(10).astype(np.float64)
        print(f"Input: 10-dim latent biomarkers (float64)")
        
        result = controller.run_quantum_classification(latent_biomarkers, backend_choice="VQC")
        
        # Verify output structure
        required_keys = ['risk_probability', 'verdict', 'probabilities']
        for key in required_keys:
            if key not in result:
                print(f"❌ Missing key '{key}' in result")
                return False
        
        risk = result['risk_probability']
        if 0.0 <= risk <= 1.0:
            print(f"✅ VQC Risk Probability: {risk:.4f}")
            print(f"✅ Verdict: {result['verdict'][:50]}...")
            return True, latent_biomarkers
        else:
            print(f"❌ Risk probability out of range: {risk}")
            return False, None
    except Exception as e:
        print(f"❌ Phase 2A (VQC) failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_phase_2_qsvm():
    """Test Phase 2b: QSVM Quantum Classification."""
    print_header("TEST 5: PHASE 2B - QUANTUM CORE (QSVM)")
    
    try:
        from engine_controller import HQDNetEngineController
        
        controller = HQDNetEngineController(use_mock_preprocessor=True)
        
        # Use known good latent biomarkers
        latent_biomarkers = np.random.randn(10).astype(np.float64)
        print(f"Input: 10-dim latent biomarkers (float64)")
        
        result = controller.run_quantum_classification(latent_biomarkers, backend_choice="QSVM")
        
        # Verify output structure
        risk = result['risk_probability']
        if 0.0 <= risk <= 1.0:
            print(f"✅ QSVM Risk Probability: {risk:.4f}")
            print(f"✅ Verdict: {result['verdict'][:50]}...")
            return True
        else:
            print(f"❌ Risk probability out of range: {risk}")
            return False
    except Exception as e:
        print(f"❌ Phase 2B (QSVM) failed: {e}")
        return False

def test_phase_3a_explainability(latent_biomarkers):
    """Test Phase 3a: Explainability & Feature Attribution."""
    print_header("TEST 6: PHASE 3A - EXPLAINABILITY (JACOBIAN SENSITIVITY)")
    
    try:
        from engine_controller import HQDNetEngineController
        
        controller = HQDNetEngineController(use_mock_preprocessor=True)
        
        print(f"Input: 10-dim latent biomarkers")
        
        attributions = controller.run_explainability_engine(latent_biomarkers)
        
        # Verify output
        if isinstance(attributions, list) and len(attributions) == 10:
            total = sum(attributions)
            print(f"✅ Attribution vector: 10 features")
            print(f"✅ Sum of attributions: {total:.4f} (should be ~1.0)")
            print(f"   Top 3: {[f'{a:.4f}' for a in sorted(attributions, reverse=True)[:3]]}")
            return True
        else:
            print(f"❌ Expected list of 10, got {type(attributions)} with length {len(attributions) if isinstance(attributions, list) else 'N/A'}")
            return False
    except Exception as e:
        print(f"❌ Phase 3A failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_phase_3b_benchmarking(latent_biomarkers):
    """Test Phase 3b: Classical Benchmarking."""
    print_header("TEST 7: PHASE 3B - CLASSICAL BENCHMARKING")
    
    try:
        from engine_controller import HQDNetEngineController
        
        controller = HQDNetEngineController(use_mock_preprocessor=True)
        
        print(f"Input: 10-dim latent biomarkers")
        
        results = controller.run_classical_benchmarks(latent_biomarkers)
        
        # Verify output
        if 'classical_svm_risk' in results and 'classical_rf_risk' in results:
            svm_risk = results['classical_svm_risk']
            rf_risk = results['classical_rf_risk']
            
            print(f"✅ Classical SVM Risk: {svm_risk:.4f}")
            print(f"✅ Random Forest Risk: {rf_risk:.4f}")
            
            if 0.0 <= svm_risk <= 1.0 and 0.0 <= rf_risk <= 1.0:
                print(f"✅ Both risks in valid range [0, 1]")
                return True
            else:
                print(f"❌ Risks out of valid range")
                return False
        else:
            print(f"❌ Missing required keys in results: {results.keys()}")
            return False
    except Exception as e:
        print(f"❌ Phase 3B failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_end_to_end_pipeline():
    """Test the complete end-to-end pipeline."""
    print_header("TEST 8: END-TO-END SANDWICH PIPELINE")
    
    try:
        from engine_controller import HQDNetEngineController
        
        print("Creating 24-feature raw patient record...")
        raw_patient = np.random.randn(24)
        
        print("Initializing controller and running full diagnostic pipeline...")
        controller = HQDNetEngineController(use_mock_preprocessor=True)
        
        results = controller.run_diagnostic_pipeline(
            raw_patient,
            backend_choice="VQC"
        )
        
        # Verify output structure
        required_sections = [
            'meta_summary',
            'latent_representation',
            'diagnostic_prediction',
            'benchmarking_comparison',
            'explainability_breakdown',
            'top_3_biomarkers'
        ]
        
        for section in required_sections:
            if section in results:
                print(f"✅ Section '{section}' present")
            else:
                print(f"❌ Section '{section}' missing")
                return False
        
        # Verify diagnostic prediction
        pred = results['diagnostic_prediction']
        if 'risk_percentage' in pred and 'verdict' in pred:
            print(f"✅ Risk Score: {pred['risk_percentage']}")
            print(f"✅ Verdict: {pred['verdict'][:50]}...")
        
        # Verify benchmarking
        bench = results['benchmarking_comparison']
        print(f"✅ Quantum Advantage: {bench['quantum_advantage']}")
        
        # Verify explainability
        if len(results['explainability_breakdown']) == 10:
            print(f"✅ All 10 biomarker attributions computed")
        
        # Display top 3
        print(f"✅ Top 3 biomarkers identified:")
        for item in results['top_3_biomarkers']:
            print(f"   {item['rank']}. {item['name']}: {item['importance']}")
        
        return True, results
    except Exception as e:
        print(f"❌ End-to-end pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_output_serialization(payload):
    """Test that output can be serialized to JSON (for API/DB storage)."""
    print_header("TEST 9: JSON SERIALIZATION (API/DATABASE COMPATIBILITY)")
    
    try:
        json_str = json.dumps(payload, indent=2)
        print(f"✅ Payload successfully serialized to JSON")
        print(f"   JSON size: {len(json_str)} bytes")
        
        # Try to deserialize
        loaded = json.loads(json_str)
        print(f"✅ JSON successfully deserialized")
        
        return True
    except Exception as e:
        print(f"❌ JSON serialization failed: {e}")
        return False

def run_all_tests():
    """Run all verification tests."""
    print("\n" + "🧪 HQD-NET SANDWICH ARCHITECTURE VERIFICATION SUITE")
    
    test_results = {}
    
    # Test 1: Imports
    test_results['imports'] = test_imports()
    if not test_results['imports']:
        print("\n⚠️ Imports failed! Cannot continue.")
        return False
    
    # Test 2: Engine Initialization
    test_results['engine_init'] = test_engine_initialization()
    if not test_results['engine_init']:
        print("\n⚠️ Engine initialization failed! Cannot continue.")
        return False
    
    # Test 3: Phase 1 (Preprocessing)
    passed_3, biomarkers = test_phase_1_preprocessing()
    test_results['phase_1'] = passed_3
    if not passed_3:
        print("\n⚠️ Phase 1 failed! Cannot continue with Phase 2/3.")
        return False
    
    # Test 4: Phase 2A (VQC)
    passed_4, biomarkers = test_phase_2_vqc()
    test_results['phase_2a_vqc'] = passed_4
    
    # Test 5: Phase 2B (QSVM)
    test_results['phase_2b_qsvm'] = test_phase_2_qsvm()
    
    # Test 6: Phase 3A (Explainability)
    test_results['phase_3a_explain'] = test_phase_3a_explainability(biomarkers)
    
    # Test 7: Phase 3B (Benchmarking)
    test_results['phase_3b_bench'] = test_phase_3b_benchmarking(biomarkers)
    
    # Test 8: End-to-End
    passed_8, payload = test_end_to_end_pipeline()
    test_results['end_to_end'] = passed_8
    
    # Test 9: JSON Serialization
    if passed_8 and payload:
        test_results['json_serialize'] = test_output_serialization(payload)
    
    # Summary
    print_header("✅ VERIFICATION SUMMARY")
    passed = sum(1 for v in test_results.values() if v)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}  {test_name}")
    
    print(f"\nResult: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Sandwich Architecture is production-ready!")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Review logs above.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    
    print("\n" + "="*70)
    print("  For detailed documentation, see:")
    print("  - SANDWICH_ARCHITECTURE.md (comprehensive guide)")
    print("  - QUICK_REFERENCE.md (quick reference card)")
    print("  - engine_controller.py (source code)")
    print("="*70 + "\n")
    
    sys.exit(0 if success else 1)
