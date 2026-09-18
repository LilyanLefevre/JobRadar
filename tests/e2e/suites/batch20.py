import json, os, time, urllib.request, urllib.error
B="http://localhost:8090"
def call(m,p,b=None,t=None):
    r=urllib.request.Request(B+p,method=m,data=json.dumps(b).encode() if b is not None else None,headers={"Content-Type":"application/json",**({"Authorization":t} if t else {})})
    with urllib.request.urlopen(r,timeout=120) as x: return x.status,json.loads(x.read() or b"{}")
_,a=call("POST","/api/collections/_superusers/auth-with-password",{"identity":"admin@test.local","password":"adminpass123"});SU=a["token"]
_,u=call("POST","/api/collections/users/records",{"email":f"b{int(time.time())}@t.io","password":"password123","passwordConfirm":"password123"},SU)
_,t=call("POST",f"/api/collections/users/impersonate/{u['id']}",None,SU);T=t["token"]
call("PATCH",f"/api/collections/users/records/{u['id']}",{"profile":{"resume":"Dev","experiences":[{"poste":"Dev","entreprise":"X","categorie":"Emploi","debut":"2024","fin":"","lieu":"","description":"x"}]}},T)
call("POST","/jr/key",{"provider":"fake","key":"good"},T)
jobs=[{"site":"indeed","url":f"https://x.fr/z/{i}","titre":f"P{i}","entreprise":"E","lieu":"L","description":"d "*30} for i in range(20)]
if os.path.exists(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "fake_calls.log")): os.remove(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "fake_calls.log"))
s,r=call("POST","/jr/evaluate/batch",{"jobs":jobs},T)
log=open(os.path.join(os.environ.get("E2E_TMP", "/tmp"), "fake_calls.log")).read().split()
print("résultats:",sum(1 for x in r["results"] if x),"/20 | appels IA:",log)
print("OK   20 offres -> 2 appels (15 + 5), toutes évaluées" if sum(1 for x in r["results"] if x)==20 and log==["batch:15","batch:5"] else "FAIL")
