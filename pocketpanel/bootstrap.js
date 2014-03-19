const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Home.jsm");
Cu.import("resource://gre/modules/HomeProvider.jsm");
Cu.import("resource://gre/modules/Messaging.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const BANNER_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAGoZJREFUeNrNm3mQZXd13z/nd+99W6+zj0YaMYOWGUlgRgsSWMGMxGZsAzKGEDvGLMFlxXESUXIFp7AQi+04qWDATrnAMUgQqkISjCXssBprBDZISEgj0DajkTSj2Zfuft1vvfe3nPzxu2/p1owkMDh+Vb++7/V7/e79fs/3LL9zbgv/SI8PP9qfBXaUa/YMH2sCu4HdN26vNf8xrkt+woCv88rL+y7sdMqWngsEhdwHVMcuoryKzAipEaqJkIrsryayq5LIncBtPylC5CcA/DqvvK3nwnVLuadjAz4oXpWgoICWx8HZBUBLIlRJjJCUZNRTQz01TFbMbRUjn75xe+22f5IEfPjR/ttt0JsXem7LfM/Rd57CBazIEDiAEUEBKc0ulO+VkogEKSJggpIB1dRQzRKmaymraun+eiofuHF77dZ/EgR8+NH+Tuv1I6c6xY6T7YJebmmr0BawJXBRJTOGihEyMYiJBMQFGhRVcEEJqlhVnCqh8CTeUzXCRbPKlRsM32/WsCZjTSPb3cjMu2/cXtv1/4WA0sdvPtkqbjja7NLqFnQKT8cH5iopbSMYEeoi1FSZqGY0SlmLxPeMlErQSAAaXaUflI4PLLpA3wcS55nMLVdvzHjvlatpFoa/OeJ5sgsbpyofTY184EeNEc9IQO9Pz5vVIDc0fmvf+1eA35G7cMuTx1s7Ti32aPUtrcLSQViqZuQi9LOEukLFB9J6hXpqaJi4UiMkIogBM3CCAQFBKTRgVfEKPR9YsB6aHZJ2n/UVwx+8fJZrz5vgVDHBrXtyOpLunqql7/jF9//U7PM/t3fXj42Akx+68P3Venjb9G/v2zou+YV2/pf7Djdn51s9lvoFHevpB6UAfJrggVatghqDm6jRMIaJJK5JY2gkhlSEZPzsCl6VPARyDRQhuoFXBVUa1uHafbqLXZKlHn/4s6t54yVAsp775if54sG8+dov/FvOP/sru6avXXxH5aK8+Q8i4OhN22bTVO83olu8k63rP7h3/4cf7b/9ZLN7y0NPnKTZ6dPuFfSdJ1elEMGK4E1CUcvIaxU2TM7zusZdrEsLKkmFLxWvpKkbqJfxIClPr0ChgTxoXBqwQbEacKo0CksjKNPWgwYWFjrY+RbvvKzK716rkMzSS7bzmcc6XHj7h7h4+n/uXn25uab60qeelYT0Gd67OVi2WCe4XD7y4Uf7t5+Ya9/ywN4jLLZ6dPuWng8UqjjAiWCnJigqGRfUDvDrE3/Jv2x8GZPVMbUJbu5cz55iLQ0TKBQqISpAAK9gVclV6YVA10c38KoY55HCYzTGgpoqq6eqtAn82d1NNk1N8s7LDlBPe1x/8eV8vnYz3/2U7Ljq4c/f0b+79oHaVf3bfiQFHHrPtoVQMOsd2I5w18W/xmcmX0W71aPTt+VFKk7Bi+Am6oRGnX9lbuN3V38aqTtMRZGJBh88/i7+fPH15KsnqSaDbCAk5RUEBVcSEFUQcCGAV+rdnKleTsUI1CtMWsd6CWyeqfLAwQXmjs7xqTfBa85rQeUcZPJq7jnZ5sR/uZ4rN32TdW859A45m1t/KAKO3rRtZ68pdwQHrgd5S3A53Lr1V7ln1XbO0cNsTQ/TyLpQC9xdXMAhzuLfzX6FN9V3IXWPVAIyHfh652W84+B/pL1mGlJDIjEVpjKqBVTBo7igOA2EoJEV75lpdjCFoxICdaAiUA+eD73mPK44d4aP7Xqc27/9KF/79ZxzppowcRVSO4+v7TnJmj9+F+e/ei8zPz1zjWx8ZNcPQ8D7Fw6Zm70F24aiA66AmU3KqrOVNFMwAhWQCSVZ5UhWW/xChjGK1ANm0tKqNLj64f/OU6s3oWkCxlDmPkRAkGEhpKpoGfAi+EBaWCZaPRLrSZ0n9Z6qBqqqBOv4T2/Yzhsv3cRDh5v8n2/+He+79nEIOWb1L4II3959mJlP/gcuef/D+9H2pXI2T4sJ5nQEtOeE7hJ05qAzD8Yo517kWbMxYFA0lFftQPuCX0iwR6pgBRJAFAQ+ffi1nKytIfEBcR7GlrpA8B7vPcF71C9/P3GeJCghSxET7WRV6VhHKy9w3nPj53Zz9+NzXHL2LO//5V9AqhdAyNHml4HA5ZfUOHbx6+nNXbIFuOF0WM0ZHOPlnVPQPgWr1gc2b/Ok1VG6WvZQQAWCjPRkIF8w7Dp6KYlA5jyZ9STOIbYEaR1YX674XJwnsZ7Muvg3PmAAl6X0axlFvYpv1Ok4T7uwoMr1n7qLpZ6Nlz1xOaBobw/auY+q9HnhW6/i8NJOgH+vh5++Cz0tAa4PrZNw1vMCazYGNMho9yZjuMdIGN/doUL7qZSf23sHxnoqLq6q9VSto2JdlLR15YqgK9ZRsfFzFetIhmrxGFe6gfNUK1XIqkhjgp6m/MFt34/nzTYgs68FLdDW3aAF65KTnLNtK8Qt+A3PiYDgYOslnjVnBVRlCFSHYJezoMuOAgqulbBz6V7+6Mn/ymWdR0isiyBLImqFKwlZvirORaWUwNVF5aTOkzlP4kKMHCL0CkuB4Qt3H+DwXAc0R6qbkel/BqGP9vaC9qnSAtkC8LZnrQMWf//8WdfxW1wbvHu64pdJH2AQD0JcGojuECIhO5v38hq5l3RtSramQjpd4b57YNd9KXf+1Ju4/4JrlpXCqKJlFjAhkPhyhQA+EHwguIB6j3OednDUTcqf/NX3+MO3boewhExcjPb3oMURJD0ftFdeIFv0MDvkbHafUQHBcnPIdUtwoH6Fzw+sryxfJQlaAicIrhDyDvS6gm2DPeLp781p39vmfNti26o+k3MHUetQ69GxmJBYR1ZYTLsLnV7pCoHgPGHoFo7gHGodhXV8/jsHWGqfgrAEvoU0toObR9J1ELqAH6DYeUYFHL1p2xZfhBtCDupLvw+DRkVc5W6+3OZGo4mW1UwQ1IN4sF1oz0XCXCFM1gOCxzshPX87YdtaDrW2khauDC1RBSYoEgKu28flORoCzgeMKtnEBOoD6jzBO4z3pM6ReIdT4ev37ueXXlJFwxJIgGw6KjKZBnd4APNFZyTAwM2aK8FJ/EMpAY5JfqAAGQ8MfmB9jcQFqEwprkiZev5WVl96AbXNm+jNLyLTM8xe9Dx2fWoPx9bvILMlARr7BkWvT/ABVxSYEDBBSYInDYqZX8DWG4QQ+wSJj/HBe4fzni/ffZA3vngNhFZ0BZOAO4Y0XgT5EOaWMxMQ9DqfRytqiGqWhGG1JiulP+4CfowIr8xsUba9OGPykg1kG1dR2XQWjUu2M3/0FH/0jQ5flCtjfTBQpio2L1Dv0Lwg1TIGhDCMBcF7TPCYrELiPcY5vPdY7wkLx/nmAx68KQlogfSjS1ReB8k54A9BbMo+nYCjN227jjzMBhtBBB+xmaQMbGZAgg4j/YAUDSClAvCCOqhNQVjVpvfwfdjjB7CHn+JOPZ//fHArB10DqoIvrT+ML0WBsTELGI3WN8GjIcSCKXg0d0iaIWkFV4I/e1WFQ8d7LOSBg8dPsXlNNwLXFoQEJIPsNWhxCyLMdnfVd9a29neb5/mmGclf3xAKIvByDSyvY3FAV6S+cQWoL9XjDeqh/kKL5m2WWgU37ruQGx7ZylO2TjBJDH7FYFnUWoxJoFJFq1VCmqHe4azF2QLvCoLNCbbAtRfpL81TdJconOMl2zbwO7/yMsQWHDo2DyEGQw0OJY0XW3kl6hLUGY59/Oy3qTfXLXeBwE7vIgCCoiF2bDSAmLFscAY3GAQ/HGgSVWCqwsTlBa+/958zX11Nv1IBF8AXw164ImUA1GH/cMBuqFTRIkdtgYayZA4OvEd9D/GOUJvm4LEmf/bBX+Ku7+0Bfz9k29F8L/jFeB4toPIicCmK4r1c19u3tglHYxo8etO2LQpbQgEhjKW/0voDFaBSpmpd9v5QBU6GKgjWoA6SWZhLZ3AYUluQ2ILEWkxRYKwlsQWmsCTWknY7mOYCsnAKTp3A9LokIvjS8sEVqLWoKxBn4yqzAcDHfuctfOcHilTOg2Q96i2YVYAF7aPmAtSlPLA4PZvPux3jCtihTghOS8Dy9IIHhplhHPwwRZbEiYsbIjUQrGAMeB8wwZa7wNLy8vSNqO/3cHkPNMROcYjpLtjSMsEjwSM+Ho13JK7g4Uf3A47NGxu8+dUvANPAZDM4VyDSGAZFDZPc8/hWTro6/U5tLAgqW7yT3d7rDnURowwrMxlVe8QiR0URKScZJRG9RVg4InQWBDuRceJF67hozRwzIScvLEYEMXEDLBK3wcORUCn/4D2hyEuFBUKhJfAQgQcPIcRMEBwSPPXWKYpmAfYgYNm8eSv4ExCOYrJDkM6AX4CwgKlsRe1D7O1W8UGXZYHb1OlHghfUK8aUBVCpBC1LXEXLNvYoA7gc9t1taM9DbSJG/9/Pr+ah+zYQTMIrNh0it3bYCpcxFciwJ1gORZxDbDH0OQmDY0DUx2PwGB0pwAyIKR4EtYjOgXsc7N8j8n0kE/AnIcyhrs9dj21gSQ3rXzhGwFm/t2f/geu3xQwQBDFaprZRAFwm/1IF3il7vpNg+zC1GupTYOsZD9hN2KyOAF89vpVQiUHPx4nIaFu5rCscWa06WwIOhCQjdUW0/hgRA9ASfAyIwUH+96A2Vn3FF9HiMYJdR4KCPwphDmybhw5McvalHcQmIwKOvGfbjv4chCBo0FiVBYYkqIyKoCj/6BbHnzC4AiZXwcQ0NCaV2mSOP54g3sW2uKSkrih93qAykL48fXeloCYlLVq46gSV3lIEPgA/VIIfxgS8i8f+Z2Kwq72R0N1D6KdI43JwB0Gb4E+gxRzf3bOJP/2V/YRcxlwgMBucxAxQFjWiYLzGgBZAy4pweO0S/X1iBianoTGt1BuKqcLbph/ks83taDCoGFQkrnIbCxKJGCNhsBcA8JUGSILxtrT2iAQ0FkYEXxIQj759EhSSte/GPfVZfK9KbdVacHtBT0HYzyMHuvzajie4fP08oSe7hwRogKSm5C0pU50SAhgfO1yEqC6Scv8YRrGgMQmNqRJ8BUwG79n0PbqacPv81mUERODjBIw1ocpmg5Q1gLgcEYOxPWQQhEKI4HVcAZ6rLpyjmJsEhPrz5vDFZUh6DJFHwM9DOAmhxcZ0A//6qkOEvgE4MK4AROL3xXwej16EpBztDlPeYJMUlNoE1BtKraaYRJFEwMT9w4ee/11ePHOcjx+8mMPFxAh8GQOmKpZXnHOIV219ipnJPlJRWrbKXzx4AX/z2KayGBLEFWgJfkDCELwGXnPNRbjj38It1CGtgz1AUl9NOnkPuCdiRgmxSp2wBp8PJbdrpACvCLJLRXYqxCoOHZ7HMBYI/Sh+VWtQLcFjSvBmFNNev/YAr19/gI8/tZ17l9bS9hlnTfS4dtMRrt18mJlGjmTRbUw1kEzAz76gz3ceP8xvfu4iWjZFkwx67Xhyk4C1w7Skqrzrl7fSe+hufCsjXb0R7A/IZg+h1kY/DxJbet7gFjO0EECbs+96fJkLNE2id5pEd1orSBgkKcU7QRKNv5NRwQNQqShpWmaOMKobNIwShgDXn/voUBmkQBalHnKDeEWdorkh9CHpLfKSzTXeu/MR3vvX25GkAvVJtNtCkozgOzFtllnjki2Pk2pCf5/BrC+g+CsIewm9tOxnmBiLnMEvpYP647Zlu8HN/23vbmD3w2/ZfnMIgBcwEbRzkXgJUQk6Fghr9bIgip0kjAhBdHQTxIpt9LDBMtY4KeaFzkmh31e8g8mzAjNbD7M0dy7GF0OgUpsg9Lto8MMvu+T8NtPZ/yaveLRtSCf3oEUbtQbfbcSKNhjUG3yzgvaHd6bcftp+QJqyO3h2iIKzQCKIRBXEeYYO02L8fAQvSdzfkCsmCMGBpKBpdAk1lERFdYQCfEfoNoWlRaE1D9023CVr2JWuZ2K9sqc5gyR21CdULSN/GBLw5lceIOT7EVMjtM8imewTuinBJrhOfdimUy+44xVCHxD2r3vvvttOS0CWhV3BJzuMiTL3AuIFsVHqEt18UAFHSZftsKQKRU8gh7SimDRmDIkjoPJCwFvIe9DtGDpL0FmCY3mFz5pzeCyZApPCKcAoGiIBQtkkRQghlKWz8srL5gntDN9JydZ18UWKuoRQZPh2WnapIgHhZBa7QsKnz9gRShLurNb1hu6SkJjYHo8kRNBS7nyWzfWNDmVenVCKXGjOG0QhSeM0LISYrp0Vij70e9Dvgu3DHazhS2Y9vaQCaYYMtsXeDbfFg5FZcLZMg8qrrlhgY91gW3V8KyNZ53FLjZIAg1+qjJq4Fvxc3Mm6ttx6RgLO/eTe2x5+07ZmOzArxHqAErj4snZOo1ssiweD1ChQqSlrz4HOktBrww8OVZmxjqoPeA9PuRonfcZjNPi+TDEvlWh1QJyN54TRnJAR+EhAjMC/+rIF7GKVdDIlGIdUwC2lqDVokeDbZhiQdUHQPhxsVlhj3RZg/xnnApVUbxUjN9i+kqSxBh4MMhGNTY9SCUMSTFkuM7rja2JKmZgRzplW/s13t9JyyaD1MdoOYEbWZvndYkPfH5TIY+Df+tNNLt9gSZlA+oLv2FGadkLoG3zHDLfp4Zhy37EJwhKsWe2eeTKUJnxsckpjl8srwQt+WHGWzx34EEvnwTBk0EjFj14TlAsmc76w83EuW9WJBc1wrx/H3+Jc7PEXOT7v4Ys+vuijwZefjyp4+Tkttq0u2Lau4DdevAi9hIqmhCb4xQS3mOAXU9xSgls0hLYQ2oawKLQWEz758BrOyXJ8WD4hPu14fN+bL7zlyFHzdt+HJBXSVIfHNIUkUZKEcpXb53LJ4JiMPTdRHkf7GUf7KY+1anzz2CT3zTVKYwe8LUYXZQxJWhm+ft9Vx3jd8xf526cmuGJzj1WrPNObFJPB0vEYSwa9CjyErsTSHWg3hd/8zrn8fHqC157XbV78F3tXPeNojJj9PjA1qW9f6AneDeQ/coMxscfUporR8UHJaI44GHmJwFlVy1l1y9FuhQum8xEBQRFjYoArH1NZ4F9csMBl67pcvr5LsPDyDR3SRJmcCZDHdFqcSkYN2sForhid+yMPrifknlec10XCqAB6RgUA7Llu20eOHZMbbD9G8zQVkgzSBJJSCSZRErNcCTKuBClT5fjrQR4VaHvDffMN9jTTwdgJgCs25Fy4qmAqC8PhjDqoziqNdaG80VIp2ob28eVerH40BfvmkUn+fO9a3rflEBszhw9sfcHte/Y/JwIe+oVts/2+3D93ki1GxklQkkQiCQPgCaQmVozGrHAJWeEapyFitHT4fKxbRpJBdUZJKqPvFKO0jxt8IcPttKoQSuu3reGvn5zmjesXsLngLR994f/d8+7nrACA+169fWeryR39biRgSEKq8XVS/t7EmGAGajAarTQgQsYIkOVEjFoEK8gg+nhSAZONvm+wbFfIl0rXHJTjhQw72qFQXB5rj7wvu1GuufSrjzaf5u7PRMAnHj+1/zfOW7uq6OtLgpfTczfIaypj2WvU8RmfK8rK2QJj47Yxa4iJZA7TZVnRDYavLhf6C7EcNeU9CVqA5oBTfB7vaXJW6Lal6QquueIbjx47HcZnu1dYgOSOK7d/I2/rzyASLZwNrB8zgxlmhFFcMOWKz3VkcTNm9TM9LxVjssFzHd5YFXy0vjCmIq+EfJSynRNsIXTbPNDp8c5X3P3o/ZzhVofk2cADyYxJv3LhZP3VvtD145YfGk9HrwcloY52rPEuk1Ihy1QA5TZ6xRo8hjVGnDS5Hvj+yGqD4Oj7EbRzgrNCryvMz/F3Xz3Suu5dDz65/zTf/KwEDGySANndS209VbgvXzYxea0E1qkO0t9yMMNtOqUsB8CHFW3sC46nrWUu8bQbLsrul4vTLQ1jwEMEb3tgbQRurbBw0vDkCffRNzyw97e+1Wz1zkDtD0cAUNnX78veXv63V9anfyZR1sQLkeHXmiRuegY+H5ZVtDK24jyQsdfLZow6NocoQS6//SaS4gqh6AvWReCLc8ITB8Puzx9eePdNTx28ndHQPrB8tPOcCDBjBKQlCdWjtjCfb8597erGzLmTkjxflkk8+nwcoJRxcUwRYThnlNh+L4c+y8kpA91Y82Q4myxbAc4KeW6whZDnwvwJYe+RlLDo+ePjx3779ub8PsCWy42RcFoVPJMC5DQkZED1S0sLD6xJsvZZSeXiBLKBXH2ZKURKcAyC2GAUNn4VZatcheBl1OvUwXwiEhWC4J2QF4bCxtdFX3nkaMb/OLKGB3oJl1c73Nls/cn/as7dC/TLVawgIPwoQdCsWAMy0nu67WOP9PsPn5fVtzSQVQM1hJKIgeViH2B5U1eHQEe9ghAGRJSgQ4zo1kokVmND5J7DFW45vo7dMsm1Myd4adbjG6dan/jYiWNfBtpAd4yAcRWcVgHPlAYHoFOgAtSAOjABTAMzwCpg7XUzq176c1OzP78mS2eqiWASQQa3BhspK8QyLWZx+z/okJuxQskkY8F0zGa6MsgqdHvKgQV78Najpz6xq730A2ABWFpBQn4aN/ih6oABCUP5lyQ0gMmSiNmSiNVvmV1z9Usbky/dlGXr62lJhJEh+MFzKWuGwahwbFww+ve58fq+/GGd0u4FnmwV++5b6n7rlvmTXx8D3gI6Jfh8TAH+mYLgc/mnKbMyI5yGiMkxVczsnJi65KrG5BXbqrXtU2lS88T/BaylhjSRYZU3IkCW1f8C9Gw0f896lmxoHunZw0/28j3f7rbveTjv7R8D3S6B98as/qzS/2EIGA+KwxhQEjHuGgNCJso1CUy8bmp2x0WV2osmjNnQ01BkRsKGLNs4m0Z3CcD9S50njjl3QmILMhhwh5090tOw+GC/d+CUd3MlyPE1kHlvhcXds1n9RyHguWSHypg6qiUx1bE1eD8bVJivmpg6b6DyB/q9wye8a5cABmDysdVf8bo4Tbp7zsB/VAJWEjFOhhlTx/jKyuOAsMHnV87IBxc+AOJWrHGgKwGHZ5P6j5uAZyPEjLmMWfE7swK8nLkYHvrwuGVXVnb6D73wn8RDTnOUM7zHCiCnO/5YwJ7u8f8AF6T5Hgrd/NIAAAAASUVORK5CYII=";

const PANEL_ID = "com.margaretleibovic.pocket";
const DATASET_ID = "com.margaretleibovic.pocket.items";

XPCOMUtils.defineLazyGetter(this, "Pocket", function() {
  let win = Services.wm.getMostRecentWindow("navigator:browser");
  Services.scriptloader.loadSubScript("chrome://pocketpanel/content/pocket.js", win);
  return win.Pocket;
});

function openPocketPanel() {
  Services.wm.getMostRecentWindow("navigator:browser").BrowserApp.loadURI("about:home?page=" + PANEL_ID);
}

function updateData(callback) {
  // Don't try to update data if the user isn't authenticated.
  if (!Pocket.isAuthenticated) {
    return;
  }

  Pocket.getItems(function(list) {
    let items = [];
    for (let id in list) {
      let item = list[id];
      items.push({
        title: item.resolved_title,
        description: item.excerpt,
        url: "about:reader?url=" + encodeURIComponent(item.resolved_url)
      });
    }
    saveItems(items, callback);
  });
}

function saveItems(items, callback) {
  Task.spawn(function() {
    let storage = HomeProvider.getStorage(DATASET_ID);
    yield storage.deleteAll();
    yield storage.save(items);
  }).then(callback, e => Cu.reportError("Error saving Pocket items to HomeProvider: " + e));
}

function deleteItems() {
  Task.spawn(function() {
    let storage = HomeProvider.getStorage(DATASET_ID);
    yield storage.deleteAll();
  }).then(null, e => Cu.reportError("Error deleting Pocket items from HomeProvider: " + e));
}

function openPanelPicker() {
  let msg = {
    type: "Intent:Open",
    // This can go away once bug 982461 lands
    packageName: "org.mozilla.fennec",
    className: "org.mozilla.gecko.home.HomePanelPicker"
  };

  sendMessageToJava(msg);
}

var gMenuId;

// Add a menu-item as a hack to force update data.
function addMenuItem(window) {
  gMenuId = window.NativeWindow.menu.add({
    name: "Update Pocket panel",
    parent: window.NativeWindow.menu.toolsMenuID,
    callback: function() {
      if (!Pocket.isAuthenticated) {
        Pocket.authenticate(() => updateData(openPocketPanel));
      } else {
        updateData(openPocketPanel);
      }
    }
  });
}

function removeMenuItem(window) {
  window.NativeWindow.menu.remove(gMenuId);
}

/**
 * bootstrap.js API
 */
var windowListener = {
  // Wait for the window to finish loading
  onOpenWindow: function(aWindow) {
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      addMenuItem(domWindow);
    }, false);
  },
  onCloseWindow: function(aWindow) {},
  onWindowTitleChange: function(aWindow, aTitle) {}
};

function startup(aData, aReason) {
  // Load menu item into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    addMenuItem(domWindow);
  }

  // Use a window listener to add a menu item to any new windows.
  Services.wm.addListener(windowListener);

  // Callback function that generates panel configuation
  function optionsCallback() {
    return {
      title: "Pocket",
      views: [{
        type: Home.panels.View.LIST,
        dataset: DATASET_ID
      }],
      authHandler: {
        authenticate: function authenticate() {
          Pocket.authenticate(function() {
            Home.panels.setAuthenticated(PANEL_ID, true);
            updateData(openPocketPanel);
          });
        },
        messageText: "Please log in to Pocket",
        buttonText: "Log in"
      }
    };
  }

  // Always register a panel and a periodic sync listener.
  Home.panels.register(PANEL_ID, optionsCallback);
  HomeProvider.addPeriodicSync(DATASET_ID, 3600, updateData);

  // Register some other stub panels
  Home.panels.register("test1", function() { return { title: "Test 1", views: [{ type: Home.panels.View.LIST, dataset: "test1" }]}});
  Home.panels.register("test2", function() { return { title: "Test 2", views: [{ type: Home.panels.View.LIST, dataset: "test2" }]}});
  Home.panels.register("test3", function() { return { title: "Test 3", views: [{ type: Home.panels.View.LIST, dataset: "test3" }]}});
  Home.panels.register("test4", function() { return { title: "Test 4", views: [{ type: Home.panels.View.LIST, dataset: "test4" }]}});


  Home.banner.add({
    text: "Personalize your Home page with lists and feeds! <a href\"#\">Try it out</a>",
    icon: BANNER_ICON,
    onclick: openPanelPicker
  });

  switch(aReason) {
    case ADDON_UPGRADE:
    case ADDON_DOWNGRADE:
      Home.panels.update(PANEL_ID);
      break;
  }
}

function shutdown(aData, aReason) {
  if (aReason == ADDON_UNINSTALL || aReason == ADDON_DISABLE) {
    deleteItems();
    Home.panels.uninstall(PANEL_ID);
    try {
      Home.panels.setAuthenticated(PANEL_ID, false);
    } catch (e) {}
    Pocket.clearAccessToken();
  }

  Home.panels.unregister(PANEL_ID);

  // Remove menu item from any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    removeMenuItem(domWindow);
  }

  // Stop listening for new windows
  Services.wm.removeListener(windowListener);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
