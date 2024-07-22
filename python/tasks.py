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
import sys
import traceback
# from progress.bar import ChargingBar
# from threading import Thread
# import time
# import multiprocessing
# import signal
# import functools

app = Celery('tasks', backend='redis://redis', broker='redis://redis')

@app.task
def get_lasair_phot(transient):
    data = get_lasair_data(transient=transient, transient_type='supernova')
    data = {col_kv[0]: [row_kv[1] for row_kv in col_kv[1].items()] for col_kv in data.items()}

    return {"time": data["time"], "band": data["band"], "flux": data["flux_density(mjy)"], "flux_err": data["flux_density_error"]}

# @app.task(bind=True)
# def apply_model(self, transient, model, n_p0):
#     return self.replace(_apply_model.s(transient, model, n_p0))

@app.task#(base=Singleton)
def apply_model(transient, smodel, n_p0):
    x0x1c = ['salt2'] # for lookup purposes

    data = get_lasair_data(transient=transient, transient_type='supernova')
    sncosmo_data = pd.DataFrame()
    sncosmo_data["time"] = data["time"]
    sncosmo_data["band"] = data["band"]
    sncosmo_data["flux"] = data["flux_density(mjy)"]
    sncosmo_data["flux_err"] = data["flux_density_error"]
    sncosmo_data["zp"] = [25] * len(data)
    sncosmo_data["zpsys"] = data["system"].str.lower()
    n_p = len(data)
    if n_p0 is not None and n_p0 != n_p:
        return None
    data = {col_kv[0]: [row_kv[1] for row_kv in col_kv[1].items()] for col_kv in sncosmo_data.items()}
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
        if not salt:
            summary1["amplitude"] = str(result.param_dict["amplitude"]) + " ± " + str(result.errors["amplitude"])
        else:
            summary1["amplitude"] = "x0=" + str(result.param_dict["x0"]) + " ± " + str(result.errors["x0"]) + "; x1=" + str(result.param_dict["x1"]) + " ± " + str(result.errors["x1"]) + "; c=" + str(result.param_dict["c"]) + " ± " + str(result.errors["c"])
        summary1["t0"] = str(result.param_dict["t0"]) + " ± " + str(result.errors["t0"])


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
        print("MODEL", smodel, "for", transient, "caused an exception !!!!!!!!!!!!!!!")
        return None

