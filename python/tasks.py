from celery import Celery
# from celery_singleton import Singleton


import numpy as np
import pandas as pd
import math
# import openpyxl
import sncosmo
from redback.get_data import get_lasair_data
import logging
logging.getLogger('redback').setLevel(40) # just shut up
import sys, os
import traceback
# from progress.bar import ChargingBar
# from threading import Thread
# import time
# import multiprocessing
# import signal
# import functools

app = Celery('tasks', backend='redis://redis', broker='redis://redis')
x0x1c = ['salt2'] # for lookup purposes

@app.task
def get_lasair_phot(transient):
    os.system("rm ./supernova/*"+transient+"*")
    data = get_lasair_data(transient=transient, transient_type='supernova')
    data = {col_kv[0]: [row_kv[1] for row_kv in col_kv[1].items()] for col_kv in data.items()}

    return {"time": data["time"], "band": data["band"], "flux": data["flux_density(mjy)"], "flux_err": data["flux_density_error"]}

# @app.task(bind=True)
# def apply_model(self, transient, model):
#     return self.replace(_apply_model.s(transient, model))

@app.task#(base=Singleton)
def fit_model(data, smodel):


    #data = get_lasair_data(transient=transient, transient_type='supernova')
    n_p = len(data["time"])
    # sncosmo_data = pd.DataFrame()
    # sncosmo_data["time"] = data["time"]
    # sncosmo_data["band"] = data["band"]
    # sncosmo_data["flux"] = data["flux_density(mjy)"]
    # sncosmo_data["flux_err"] = data["flux_density_error"]
    # sncosmo_data["zp"] = [25] * len(data)
    # sncosmo_data["zpsys"] = data["system"].str.lower()
    data["zp"] = [25] * n_p
    data["zpsys"] = ['ab'] * n_p
    # if n_p0 is not None and n_p0 != n_p:
    #     return None
    # data = {col_kv[0]: [row_kv[1] for row_kv in col_kv[1].items()] for col_kv in sncosmo_data.items()}
    data = sncosmo.photdata.PhotometricData(data)
    data.sort_by_time()

    try:
        guess_red_shift = True
        red_shift = 0.065
        summary1 = {}
        summary1["model"] = smodel
        model = sncosmo.Model(source=smodel)
        model.set(z=red_shift)
        type = "N/A"
        for m in sncosmo.models._SOURCES.get_loaders_metadata():
            if smodel == m["name"]:
                type = m["type"]
        summary1["type"] = type

        salt = smodel in x0x1c

        # run the fit
        bounds={'z':(0.0001, 0.2)} if guess_red_shift else {}
        fparams = ['z'] if guess_red_shift else []
        fparams+= ['t0', 'amplitude'] if not salt else ['t0', 'x0', 'x1', 'c']
        if salt:
            result, fitted_model = sncosmo.fit_lc(
                data, model,
                fparams, bounds=bounds)
            p = result.parameters
            bounds |= {'x0':(0, p[2]*10), 'x1':(p[3],p[3]), 'c': (p[4],p[4])}
        result, fitted_model = sncosmo.nest_lc(
            data, model,
            fparams, bounds=bounds, guess_amplitude_bound=not salt)


        summary1["logz"] = result.logz
        summary1["logz_err"] = result.logzerr
        summary1["logl_err"] = math.sqrt(np.sum(result.logl**2)/len(result.logl)-(np.sum(result.logl)/len(result.logl))**2)
        summary1["logl_1"] = np.sum(result.logl)/len(result.logl)
        summary1["time"] = result.time

        if not salt:
            summary1["amplitude"] = result.param_dict["amplitude"]
            summary1["amplitude_err"] = result.errors["amplitude"]
        else:
            summary1["x0"] = result.param_dict["x0"]
            summary1["x0_err"] = result.errors["x0"]
            summary1["x1"] = result.param_dict["x1"]
            summary1["x1_err"] = result.errors["x1"]
            summary1["c"] = result.param_dict["c"]
            summary1["c_err"] = result.errors["c"]
        summary1["t0"] = result.param_dict["t0"]
        summary1["t0_err"] = result.errors["t0"]
        summary1["z"] = result.param_dict["z"]
        summary1["z_err"] = result.errors["z"]

        # create a model ================== 2
        bounds2={}
        sys.modules["Negfix"] = 1
        for p in fparams:
            bounds2[p]=(result.param_dict[p],result.param_dict[p])
        model.set(z=red_shift)
        # run the fit
        result, fitted_model = sncosmo.nest_lc(
            data, model,
            fparams,
            bounds=bounds2)
        sys.modules["Negfix"] = 0

        summary1["logl"] = result.logl[0]

        return summary1
    except:
        traceback.print_exc()
        print("MODEL", smodel, "caused an exception !!!!!!!!!!!!!!!")
        return None

@app.task
def get_model_flux(models):
    ans = []
    for mobj in models:
        smodel, params = mobj["model"], mobj["params"]
        model = sncosmo.Model(source=smodel)
        params = {key: params[key] for key in ['z', 't0', 'x0', 'x1', 'c']} if smodel in x0x1c else {key: params[key] for key in ['z', 't0', 'amplitude']}
        model.set(**params)
        tgrid =  np.linspace(model.mintime(), model.maxtime(), 16)
        bands = ["ztfr", "ztfg"]
        ans1 = {"time": tgrid.tolist()}
        for b in bands:
            try:
                ans1[b] = model.bandflux(b, tgrid, zp=25, zpsys='ab').tolist()
            except:
                traceback.print_exc()
                print("MODEL", smodel, "band", b, "caused an exception !!!!!!!!!!!!!!!", params, "params")
        ans += [{"model": smodel, "bands": bands, "data": ans1}]
    return ans
