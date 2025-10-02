const VEHICLE_CATALOG = {
            bmwAutos: {
                nombre: 'BMW',
                tipo: 'Carro',
                series: {
                    serie_1: {
                        nombre: 'Serie 1',
                        modelos: [
                            '114i - hatchback',
                            '116i - hatchback',
                            '118 - hatchback',
                            '118d - hatchback',
                            '118i - hatchback',
                            '120d - hatchback',
                            '120i - descapotables',
                            '120i - hatchback',
                            '120i - sedan',
                            '125i - sedan',
                            '128i - descapotables',
                            '128ti - hatchback',
                            '130i - hatchback',
                            '135i - descapotables',
                            '135i - sedan'
                        ]
                    },
                    serie_2: {
                        nombre: 'Serie 2',
                        modelos: [
                            '218 - sedan',
                            '218i - hatchback',
                            '218i - sedan',
                            '218i - van pasajeros',
                            '220i - descapotables',
                            '220i - sedan',
                            '225xe - hatchback'
                        ]
                    },
                    serie_3: {
                        nombre: 'Serie 3',
                        modelos: [
                            '316 - sedan',
                            '316i - hatchback',
                            '316i - sedan',
                            '318ci - sedan',
                            '318i - descapotables',
                            '318i - sedan',
                            '318ia - descapotables',
                            '318is - sedan',
                            '318ti - hatchback',
                            '320/4 - sedan',
                            '320/6 - sedan',
                            '320d - sedan',
                            '320i - descapotables',
                            '320i - facelift - sedan',
                            '320i - hatchback',
                            '320i - sedan',
                            '320i - station wagon',
                            '320ia - sedan',
                            '323i - sedan',
                            '323tia - hatchback',
                            '325ci - descapotables',
                            '325ci - sedan',
                            '325e - sedan',
                            '325i - descapotables',
                            '325i - sedan',
                            '325i - station wagon',
                            '325is - sedan',
                            '325ti - hatchback',
                            '328ci - sedan',
                            '328i - descapotables',
                            '328i - sedan',
                            '328i - station wagon',
                            '330ci - descapotables',
                            '330ci - sedan',
                            '330e - sedan',
                            '330i - descapotables',
                            '330i - hatchback',
                            '330i - sedan',
                            '330i - station wagon',
                            '330xi - sedan',
                            '335i - descapotables',
                            '335i - sedan',
                            '340i - sedan'
                        ]
                    },
                    serie_4: {
                        nombre: 'Serie 4',
                        modelos: [
                            '418i - hatchback',
                            '420i - descapotables',
                            '420i - hatchback',
                            '420i - sedan',
                            '428i - descapotables',
                            '428i - hatchback',
                            '428i - sedan',
                            '430i - descapotables',
                            '430i - hatchback',
                            '430i - sedan',
                            '435i - descapotables',
                            '435i - hatchback',
                            '435i - sedan',
                            '440i - descapotables',
                            '440i - sedan'
                        ]
                    },
                    serie_5: {
                        nombre: 'Serie 5',
                        modelos: [
                            '518 - sedan',
                            '518i - sedan',
                            '520 - sedan',
                            '520d - sedan',
                            '520i - sedan',
                            '523i - sedan',
                            '523ia - sedan',
                            '525 - sedan',
                            '525i - sedan',
                            '525i - station wagon',
                            '525xi - sedan',
                            '528 - sedan',
                            '528i - sedan',
                            '528ia - sedan',
                            '528ia - station wagon',
                            '530d - sedan',
                            '530e - sedan',
                            '530i - sedan',
                            '530i - station wagon',
                            '530ia - station wagon',
                            '535i - hatchback',
                            '535i - sedan',
                            '540i - sedan',
                            '540i - station wagon',
                            '540ia - sedan',
                            '545i - sedan',
                            '550i - hatchback',
                            '550i - sedan'
                        ]
                    },
                    serie_6: {
                        nombre: 'Serie 6',
                        modelos: [
                            '628csi - sedan',
                            '630i - descapotables',
                            '630i - sedan',
                            '635csi - sedan',
                            '640i - descapotables',
                            '640i - sedan',
                            '645ci - sedan',
                            '650i - descapotables',
                            '650i - sedan'
                        ]
                    },
                    serie_7: {
                        nombre: 'Serie 7',
                        modelos: [
                            '728i - sedan',
                            '730 - sedan',
                            '730d - sedan',
                            '730i - sedan',
                            '730ial - sedan',
                            '733i - sedan',
                            '735i - sedan',
                            '735il - sedan',
                            '740i - sedan',
                            '740il - sedan',
                            '745e - sedan',
                            '745i - sedan',
                            '750i - sedan',
                            '750il - sedan',
                            '750li - sedan',
                            '760li - sedan'
                        ]
                    },
                    serie_8: {
                        nombre: 'Serie 8',
                        modelos: [
                            '850ci - sedan'
                        ]
                    },
                    clasicos: {
                        nombre: 'Clásicos',
                        modelos: [
                            '2002 - sedan'
                        ]
                    },
                    serie_i: {
                        nombre: 'Serie i (eléctricos)',
                        modelos: [
                            'I3 - hatchback',
                            'I3s - hatchback',
                            'I4 - sedan',
                            'I5 - sedan',
                            'I7 - sedan',
                            'I8 - hatchback',
                            'Ix - utilitario deportivo 4x4',
                            'Ix1 - station wagon',
                            'Ix1 - utilitario deportivo 4x2',
                            'Ix1 - utilitario deportivo 4x4',
                            'Ix2 - utilitario deportivo 4x4',
                            'Ix3 - utilitario deportivo 4x2',
                            'Ix3 - utilitario deportivo 4x4'
                        ]
                    },
                    serie_m: {
                        nombre: 'Serie M',
                        modelos: [
                            'M - sedan',
                            'M2 - sedan',
                            'M3 - descapotables',
                            'M3 - sedan',
                            'M4 - descapotables',
                            'M4 - sedan',
                            'M5 - sedan',
                            'M6 - descapotables',
                            'M6 - sedan',
                            'M8 - sedan',
                            'M135 - hatchback',
                            'M135i - hatchback',
                            'M140i - hatchback',
                            'M235i - descapotables',
                            'M235i - sedan',
                            'M240i - descapotables',
                            'M240i - sedan',
                            'M340i - sedan',
                            'M440i - descapotables',
                            'M440i - sedan',
                            'M535i - sedan',
                            'M550i - sedan',
                            'M850i - descapotables',
                            'M850i - sedan'
                        ]
                    },
                    serie_x: {
                        nombre: 'Serie X (SUVs)',
                        modelos: [
                            'X1 - generación 2 - utilitario deportivo 4x4',
                            'X1 - generación 3 - utilitario deportivo 4x2',
                            'X1 - station wagon',
                            'X1 - utilitario deportivo 4x2',
                            'X1 - utilitario deportivo 4x4',
                            'X2 - generación 2 - utilitario deportivo 4x4',
                            'X2 - utilitario deportivo 4x2',
                            'X2 - utilitario deportivo 4x4',
                            'X3 - station wagon',
                            'X3 - utilitario deportivo 4x2',
                            'X3 - utilitario deportivo 4x4',
                            'X4 - station wagon',
                            'X4 - utilitario deportivo 4x4',
                            'X5 - facelift - utilitario deportivo 4x4',
                            'X5 - station wagon',
                            'X5 - utilitario deportivo 4x4',
                            'X6 - station wagon',
                            'X6 - utilitario deportivo 4x4',
                            'X7 - utilitario deportivo 4x4',
                            'Xm - station wagon'
                        ]
                    },
                    serie_z: {
                        nombre: 'Serie Z (Roadsters)',
                        modelos: [
                            'Z3 - descapotables',
                            'Z4 - descapotables',
                            'Z4 - hatchback'
                        ]
                    }
                }
            },
            bmwMotorrad: {
                nombre: 'BMW Motorrad',
                tipo: 'Moto',
                series: {
                    serie_c_scooters: {
                        nombre: 'Serie C (Scooters)',
                        modelos: [
                            'BMW C 600 Sport AT 650CC',
                            'BMW C 650 GT AT 650CC',
                            'BMW C 650 Sport AT 650CC',
                            'BMW C 400 X AT 350CC ABS',
                            'BMW C 400 GT AT 350CC ABS'
                        ]
                    },
                    serie_ce_scooters_el_ctricos: {
                        nombre: 'Serie CE (Scooters eléctricos)',
                        modelos: [
                            'BMW CE 04 Avantgarde/White AT ABS',
                            'BMW CE 02 Basic AT ABS',
                            'BMW CE 02 Highline AT ABS'
                        ]
                    },
                    serie_c1: {
                        nombre: 'Serie C1',
                        modelos: [
                            'BMW C1 200 AT 200CC'
                        ]
                    },
                    serie_f: {
                        nombre: 'Serie F',
                        modelos: [
                            'BMW F 650 GS Dakar MT 650CC',
                            'BMW F 650 GS MT 650CC',
                            'BMW F 650 S/ST MT 650CC',
                            'BMW F 650 GS Twin MT 800CC',
                            'BMW F 700 GS MT 800CC',
                            'BMW F 750 GS Premium MT 850CC ABS',
                            'BMW F 750 GS Comfort MT 850CC ABS',
                            'BMW F 750 GS Essential MT 850CC ABS',
                            'BMW F 800 GS MT 800CC',
                            'BMW F 800 GS Adventure MT 800CC',
                            'BMW F 800 [K80] GS MT 900CC ABS',
                            'BMW F 800 S MT 800CC',
                            'BMW F 800 R MT 800CC',
                            'BMW F 800 GT MT 800CC',
                            'BMW F 800 R [FL] MT 800CC',
                            'BMW F 850 [K81] GS Premium MT 850CC ABS',
                            'BMW F 850 [K82] GS Adventure MT 850CC ABS',
                            'BMW F 850 [K81] GS Comfort MT 850CC ABS',
                            'BMW F 900 GS-P MT 900CC ABS',
                            'BMW F 900 R Dynamic MT 900CC ABS',
                            'BMW F 900 XR Dynamic MT 900CC ABS',
                            'BMW F 900 R Pure MT 900CC ABS',
                            'BMW F 900 GS MT 900CC ABS',
                            'BMW F 900 GS Adventure Premium/HP MT 900CC ABS',
                            'BMW F 900 GS Comfort MT 900CC ABS'
                        ]
                    },
                    serie_g: {
                        nombre: 'Serie G',
                        modelos: [
                            'BMW G 310 [K02] GS MT 310CC ABS',
                            'BMW G 310 [K03] R MT 310CC ABS',
                            'BMW G 450 X MT 450CC',
                            'BMW G 650 Xmoto MT 650CC',
                            'BMW G 650 GS [180] MT 650CC',
                            'BMW G 650 GS Sertao MT 650CC',
                            'BMW G 650 GS [188] MT 650CC'
                        ]
                    },
                    serie_hp: {
                        nombre: 'Serie HP',
                        modelos: [
                            'BMW HP2 Enduro MT 1200CC',
                            'BMW HP4 Sport MT 1000CC'
                        ]
                    },
                    serie_k: {
                        nombre: 'Serie K',
                        modelos: [
                            'BMW K 75S MT 750CC',
                            'BMW K 1200S MT 1200CC',
                            'BMW K 1200LT MT 1200CC',
                            'BMW K 1300S MT 1300CC',
                            'BMW K 1600GT MT 1600CC',
                            'BMW K 1200R MT 1200CC',
                            'BMW K 1300R MT 1300CC',
                            'BMW K 1600GTL MT 1600CC',
                            'BMW K 1600GTL Exclusive MT 1600CC',
                            'BMW K 1600B MT 1600CC'
                        ]
                    },
                    serie_m: {
                        nombre: 'Serie M',
                        modelos: [
                            'BMW M 1000 RR M MT 1000CC',
                            'BMW M 1000 XR MT 1000CC ABS',
                            'BMW M [FL] 1000 RR MT 1000CC ABS'
                        ]
                    },
                    serie_r: {
                        nombre: 'Serie R',
                        modelos: [
                            'BMW R 1100 GS MT 1100CC',
                            'BMW R 1150 GS MT 1150CC',
                            'BMW R 1150 GS Adventure MT 1150CC',
                            'BMW R [K25] 1200 GS MT 1200CC',
                            'BMW R [K25] 1200 GS Adventure MT 1200CC',
                            'BMW R [K50] 1200 GS MT 1200CC',
                            'BMW R [K51] 1200 GS Adventure MT 1200CC',
                            'BMW R [K50] 1250 GS MT 1250CC ABS',
                            'BMW R [K51] 1250 GS Adventure P MT 1250CC ABS',
                            'BMW R [K51] 1250 GS Adventure R MT 1250CC ABS',
                            'BMW R 1300 GS Premium/Pro MT 1300CC ABS',
                            'BMW R 1300 GS Tramuntana MT 1300CC ABS',
                            'BMW R 850 R MT 850CC',
                            'BMW R 1150 R MT 1150CC',
                            'BMW R [K27] 1200 R MT 1200CC',
                            'BMW R 1200 C MT 1200CC',
                            'BMW R [K21] nineT MT 1200CC',
                            'BMW R [K53] 1200 R MT 1200CC ABS',
                            'BMW R [K23] nineT Scrambler MT 1200CC ABS',
                            'BMW R [K33] nineT Urban G/S MT 1200CC ABS',
                            'BMW R [K22] nineT Pure MT 1200CC ABS',
                            'BMW R 100/7T MT 980CC',
                            'BMW R [K53] 1250 R MT 1250CC ABS',
                            'BMW R [K52] 1250 RT MT 1250CC ABS',
                            'BMW R 18/Rocktane MT 1800CC ABS',
                            'BMW R [K33] nineT Urban GS Edición 40 años MT 1200CC ABS',
                            'BMW R [K52] [FL] 1250 RT MT 1250CC ABS',
                            'BMW R 12 MT 1200CC ABS',
                            'BMW R [KR1] 12 nineT Premium MT 1200CC ABS',
                            'BMW R 18 Transcontinental MT 1800CC ABS',
                            'BMW R 18 Bagger MT 1800CC ABS',
                            'BMW R 1100GS MT 1100CC',
                            'BMW R 1150GS MT 1150CC',
                            'BMW R 1150GS Adventure MT 1150CC',
                            'BMW R 1200GS [K25] MT 1200CC',
                            'BMW R 1200GS Adventure [K25] MT 1200CC',
                            'BMW R 1200GS [K50] MT 1200CC',
                            'BMW R 1200GS Adventure [K51] MT 1200CC',
                            'BMW R 1250GS [K50] MT 1250CC ABS',
                            'BMW R 1250GS Adventure P [K51] MT 1250CC ABS',
                            'BMW R 1250GS Adventure R [K51] MT 1250CC ABS',
                            'BMW R 1300GS Adventure Premium Red/Auto MT 1300CC ABS',
                            'BMW R 1300GS Adventure Premium Trophy/Black-Karakoum MT 1300CC ABS',
                            'BMW R 850R MT 850CC',
                            'BMW R 1150R MT 1150CC',
                            'BMW R 1200R [K27] MT 1200CC',
                            'BMW R 1200C MT 1200CC',
                            'BMW R nineT [K21] MT 1200CC',
                            'BMW R 1200R [K53] MT 1200CC ABS',
                            'BMW R nineT Scrambler [K23] MT 1200CC ABS',
                            'BMW R nineT Urban G/S [K33] MT 1200CC ABS',
                            'BMW R nineT Pure [K22] MT 1200CC ABS',
                            'BMW R 1250R [K53] MT 1250CC ABS',
                            'BMW R 1250RT [K52] MT 1250CC ABS',
                            'BMW R 18 Roctane MT 1800CC ABS',
                            'BMW R nineT Urban G/S 40 años [K33] MT 1200CC ABS',
                            'BMW R 1250RT [K52 FL] MT 1250CC ABS',
                            'BMW R 12 nineT Premium [KR1] MT 1200CC ABS',
                            'BMW R 1100S MT 1100CC',
                            'BMW R 1200ST MT 1200CC',
                            'BMW R 1200RT MT 1200CC',
                            'BMW R 1200RT [K52] MT 1200CC',
                            'BMW R 1200RS [K54] MT 1200CC ABS'
                        ]
                    },
                    serie_s: {
                        nombre: 'Serie S',
                        modelos: [
                            'BMW S 1000RR [K46] MT 1000CC',
                            'BMW S 1000RR M [K67] MT 1000CC',
                            'BMW S 1000RR MS Carbon [K67] MT 1000CC ABS',
                            'BMW S 1000RR Dynamic [K67] MT 1000CC ABS',
                            'BMW S 1000RR Dynamic HP MT 1000CC',
                            'BMW S 1000RR Motorsport HP MT 1000CC',
                            'BMW S 1000RR MS HP Carbon MT 1000CC ABS',
                            'BMW S 1000R Dynamic [FL] MT 1000CC ABS',
                            'BMW S 1000R MS HP [FL] MT 1000CC ABS',
                            'BMW S 1000XR Motorsport MT 1000CC ABS',
                            'BMW S 1000R [K47] MT 1000CC',
                            'BMW S 1000XR Dynamic MT 1000CC',
                            'BMW S 1000R [K47 FL] MT 1000CC',
                            'BMW S 1000R M [K63] MT 1000CC',
                            'BMW S 1000R Dynamic MT 1000CC'
                        ]
                    }
                }
            },
            mini: {
                nombre: 'MINI',
                tipo: 'Carro',
                series: {
                    mini_aceman_hatchback: {
                        nombre: 'MINI Aceman – hatchback',
                        modelos: [
                            'MINI Aceman SE Favoured AT 163KW 6AB',
                            'MINI Aceman E Classic AT 137KW 6AB'
                        ]
                    },
                    mini_clubman_hatchback: {
                        nombre: 'MINI Clubman – hatchback',
                        modelos: [
                            'MINI Clubman R55 Cooper MT 1600CC 5P',
                            'MINI Clubman R55 Cooper S MT 1600CC 5P T',
                            'MINI Clubman R55 Cooper S JCW MT 1600CC 5P T',
                            'MINI Clubman R55 Cooper S TP 1600CC 5P T',
                            'MINI Clubman F54 Peeper TP 1500CC T 6P',
                            'MINI Clubman F54 Cooper S TP 2000CC T 6P',
                            'MINI Clubman F54 JCW ALL4 TP 2000CC T CT TC 6P'
                        ]
                    },
                    mini_cooper_descapotables: {
                        nombre: 'MINI Cooper – descapotables',
                        modelos: [
                            'MINI Cooper R52 Cabriolet MT 1600CC',
                            'MINI Cooper R52 Cabriolet TP 1600CC',
                            'MINI Cooper R57 S Cabriolet MT 1600CC T',
                            'MINI Cooper R57 Cabriolet MT 1600CC',
                            'MINI Cooper R59 S Roadster TP 1600CC T',
                            'MINI Cooper R57 LCI JCW Cabrio Chili TP 1600CC T',
                            'MINI Cooper R52 S Cabriolet MT 1600CC',
                            'MINI Cooper R57 S Cabrio Connected MT 1600CC T',
                            'MINI Cooper R57 S Cabrio Connected TP 1600CC T',
                            'MINI Cooper R59 JCW Roadster MT 1600CC T',
                            'MINI Cooper R57 Cabriolet TP 1600CC',
                            'MINI Cooper F57 S Cabriolet Chili TP 2000CC T',
                            'MINI Cooper F57 Cabriolet Peeper TP 1500CC T',
                            'MINI Cooper F57 JCW Cabriolet Chili TP 2000CC T TC',
                            'MINI Cooper F57 LCI S Cabriolet Iconic TP 2000CC T',
                            'MINI Cooper F57 John Cooper Works Cabrio Spitfire TP 2000CC 6AB 4x2',
                            'MINI Cooper F67 S Cabrio Favoured TP 2000CC T 6AB',
                            'MINI Cooper F67 Cabrio JCW Max TP 2000CC T'
                        ]
                    },
                    mini_cooper_hatchback: {
                        nombre: 'MINI Cooper – hatchback',
                        modelos: [
                            'MINI COOPER R50 STD COUPE MT 1600CC',
                            'MINI COOPER R56 S COUPE TP 1600CC 3P T',
                            'MINI COOPER R56 S COUPE MT 1600CC 3P T',
                            'MINI COOPER R56 S COUPE MT 1600CC 3P T TC CT',
                            'MINI COOPER R56 1.6 COUPE MT 1600CC 3P CT',
                            'MINI COOPER R56 JOHN COOPER WORKS COUPE MT 1600CC 3P T TC',
                            'MINI COOPER R56 1.6 COUPE TP 1600CC 3P',
                            'MINI COOPER R56 1.6 COUPE MT 1600CC 3P',
                            'MINI COOPER R56 S COUPE TP 1600CC 3P T TC CT',
                            'MINI COOPER R56 1.6 COUPE TP 1600CC CT',
                            'MINI COOPER R56 LCI CONNECTED MT 1600CC 3P',
                            'MINI COOPER R56 LCI JCW JALAPEÑO MT 1600CC 3P T TC CT',
                            'MINI COOPER R61 S PACEMAN CONNECTED TP 1600CC 3P T',
                            'MINI COOPER R56 LCI S CONNECTED MT 1600CC 3P T',
                            'MINI COOPER R56 LCI JCW JALAPEÑO TP 1600CC 3P T TC CT',
                            'MINI COOPER R58 S COUPE TP 1600CC T',
                            'MINI COOPER F56 COUPE PEEPER TP 1500CC T',
                            'MINI COOPER F56 S COUPE TP 2000CC T',
                            'MINI COOPER F56 S COUPE PEEPER TP 2000CC T',
                            'MINI COOPER F56 COUPE SALT MT 1500CC T',
                            'MINI COOPER F56 COUPE SALT TP 1500CC T',
                            'MINI COOPER R56 LCI JCW GP MT 1600CC T',
                            'MINI COOPER F55 PEEPER TP 1500CC T 5P',
                            'MINI COOPER R58 S JCW MT 1600CC T 3P',
                            'MINI COOPER F55 S COOPER CHILI TP 2000CC T 5P',
                            'MINI COOPER F56 JCW TP 2000CC T 3P',
                            'MINI COOPER F55 S COOPER PEEPER TP 2000CC T 5P',
                            'MINI COOPER F55 SALT MT 1500CC T 5P',
                            'MINI COOPER F55 SALT TP 1500CC T 5P',
                            'MINI COOPER F56 S COUPE CHILI MT 2000CC T CT',
                            'MINI COOPER F56 S COUPE CHILI TP 2000CC T CT',
                            'MINI COOPER F56 S COUPE PEEPER MT 2000CC T',
                            'MINI COOPER F56 edicion 60 años aniversario TP 1500CC T TC',
                            'MINI COOPER F56 JCW GP TP 2000CC T TC',
                            'MINI COOPER F55 S COOPER SALT TP 2000CC T 5P',
                            'MINI COOPER F56 LCI SE ICONIC AT CT TC'
                        ]
                    },
                    mini_countryman_hatchback: {
                        nombre: 'MINI Countryman – hatchback',
                        modelos: [
                            'MINI COUNTRYMAN R60 COOPER S ALL4 TP 1600CC 6P T',
                            'MINI COUNTRYMAN R60 COOPER S ALL4 1600CC 6P T',
                            'MINI COUNTRYMAN R60 COOPER S CHILI MT 1600CC 6P T',
                            'MINI COUNTRYMAN R60 COOPER CHILI ALL4 TP 1600CC T 6P CT',
                            'MINI COUNTRYMAN R60 COOPER S CHILI ALL4 1600CC 6P',
                            'MINI COUNTRYMAN R60 COOPER S CHILI ALL4 TP 1600CC T 6P T',
                            'MINI COUNTRYMAN R60 COOPER S ALL4 PEEPER TP 1600CC 6P',
                            'MINI COUNTRYMAN F60 COOPER S CHILI TP 2000CC 6P T',
                            'MINI COUNTRYMAN F60 COOPER PEEPER TP 1600CC T 6P',
                            'MINI COUNTRYMAN F60 COOPER S CHILI ALL4 TP 2000CC T CT',
                            'MINI COUNTRYMAN F60 COOPER S E CHILI ALL4 TP 1600CC T 6P CT',
                            'MINI COUNTRYMAN F60 COOPER S E PEEPER ALL4 TP 1600CC T 6P CT',
                            'MINI COUNTRYMAN F60 LCI COOPER S E CLASSIC ALL4 TP 1600CC T 6P',
                            'MINI COUNTRYMAN F60 LCI COOPER S E ICONIC ALL4 TP 1600CC T 6P CT',
                            'MINI COUNTRYMAN F60 LCI COOPER S E CLASSIC TP 2000CC T 6P',
                            'MINI COUNTRYMAN F60 LCI COOPER S ICONIC TP 2000CC T 6P CT',
                            'MINI COUNTRYMAN F60 LCI COOPER S CLASSIC TP 1600CC T 6P',
                            'MINI COUNTRYMAN F60 LCI JCW ALL4 ICONIC TP 2000CC T 6P CT',
                            'MINI COUNTRYMAN F60 LCI COOPER S ALL4 ICONIC TP 2000CC T',
                            'MINI COUNTRYMAN F60 COOPER S E PEEPER ALL4 TP 1600CC 6P PHEV',
                            'MINI COUNTRYMAN U25 CLASSIC AT 1500CC 6P 6AB',
                            'MINI COUNTRYMAN U25 E CLASSIC TP 274KW 6P',
                            'MINI COUNTRYMAN U25 JCW COOPER WORKS MAX TP 2000CC T'
                        ]
                    },
                    mini_countryman_d_hatchback: {
                        nombre: 'MINI Countryman D – hatchback',
                        modelos: [
                            'MINI COUNTRYMAN D U25 FAVOURED TP 2000CC TD 5P',
                            'MINI COUNTRYMAN D U25 CLASSIC TP 2000CC TD 5P 6AB'
                        ]
                    },
                    mini_countryman_e_hatchback: {
                        nombre: 'MINI Countryman E – hatchback',
                        modelos: [
                            'MINI COUNTRYMAN E U25 FAVOURED AT 152KW 5'
                        ]
                    },
                    mini_minicord_sedan: {
                        nombre: 'MINI Minicord – sedan',
                        modelos: [
                            'MINI Mini COOPER COUPE MT 1000CC',
                            'MINI Mini COOPER 1300 COUPE MT 1300CC 2P',
                            'MINI MiniCord JOHN COOPER MT 1000CC AA'
                        ]
                    },
                    minicord_sedan: {
                        nombre: 'Minicord - sedan',
                        modelos: [
                            'MINI MiniCord BX STANDAR MT 1000CC',
                            'MINI MiniCord BA LUJO MT 1000CC AA'
                        ]
                    }
                }
            }
        };
module.exports = VEHICLE_CATALOG;