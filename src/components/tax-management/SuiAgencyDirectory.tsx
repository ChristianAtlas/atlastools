import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Phone, Mail, MapPin, Building2 } from 'lucide-react';

interface AgencyInfo {
  state: string;
  name: string;
  agency: string;
  division?: string;
  address: string;
  phones: string[];
  fax?: string;
  email?: string;
  website: string;
}

const AGENCIES: AgencyInfo[] = [
  { state: 'AL', name: 'Alabama', agency: 'Department of Labor', division: 'Unemployment Compensation Division', address: '649 Monroe St., Montgomery, AL 36131', phones: ['334-242-8025'], fax: '334-242-8258', email: 'UC@labor.alabama.gov', website: 'https://labor.alabama.gov/uc/unemployment-compensation.aspx' },
  { state: 'AK', name: 'Alaska', agency: 'Department of Labor and Workforce Development', division: 'Employment Security Tax', address: 'P.O. Box 115509, Juneau, AK 99811-5509', phones: ['907-465-2757', '888-448-3527'], fax: '907-465-2374', email: 'esd.tax@alaska.gov', website: 'https://www.labor.state.ak.us/estax/' },
  { state: 'AZ', name: 'Arizona', agency: 'Department of Economic Security', division: 'Unemployment Insurance Tax Section', address: 'P.O. Box 6028, Phoenix, AZ 85005-6028', phones: ['602-771-6602'], fax: '602-532-5539', email: 'uitstatus@azdes.gov', website: 'https://des.az.gov/services/employment/unemployment-employer' },
  { state: 'AR', name: 'Arkansas', agency: 'Division of Workforce Services', address: 'P.O. Box 2981, Little Rock, AR 72203', phones: ['501-682-3798', '501-682-3100'], fax: '501-682-8845', email: 'ADWS.Info@arkansas.gov', website: 'https://dws.arkansas.gov/workforce-services/employers/employer-ui-information/' },
  { state: 'CA', name: 'California', agency: 'Employment Development Department', address: 'P.O. Box 942880, Sacramento, CA 94280', phones: ['888-745-3886'], fax: '916-464-3504', email: 'https://askedd.edd.ca.gov/s/', website: 'https://edd.ca.gov/en/Unemployment/Employer_Information' },
  { state: 'CO', name: 'Colorado', agency: 'Department of Labor and Employment', division: 'Unemployment Insurance Tax Operations', address: 'P.O. Box 8789, Denver, CO 80201-8789', phones: ['303-318-9100'], fax: '800-480-8299', email: 'cdle_employer_services@state.co.us', website: 'https://cdle.colorado.gov/dwc/employers' },
  { state: 'CT', name: 'Connecticut', agency: 'Department of Labor', division: 'Unemployment Insurance Tax Division', address: '200 Folly Brook Blvd., Wethersfield, CT 06109-1114', phones: ['860-263-6550', '860-263-6000'], fax: '860-263-6567', email: 'dol.webhelp@ct.gov', website: 'https://portal.ct.gov/dol/divisions/unemployment-insurance-tax' },
  { state: 'DE', name: 'Delaware', agency: 'Department of Labor', division: 'Division of Unemployment Insurance', address: 'P.O. Box 9953, Wilmington, DE 19809-0950', phones: ['302-761-8482'], fax: '302-761-8484', website: 'https://labor.delaware.gov/divisions/unemployment-insurance/' },
  { state: 'DC', name: 'District of Columbia', agency: 'Department of Employment Services', division: 'Office of Unemployment Compensation Tax Division', address: '4058 Minnesota Ave. NE, 4th Floor, Washington, DC 20019', phones: ['202-724-7000', '202-698-7550'], fax: '202-673-6993', email: 'UITax.Info@dc.gov', website: 'https://does.dc.gov/page/ui-tax-employers' },
  { state: 'FL', name: 'Florida', agency: 'Department of Revenue', division: 'Reemployment Tax Division', address: '5050 W. Tennessee St., Building K, Tallahassee, FL 32399-4825', phones: ['800-482-8293', '800-352-3671'], fax: '850-921-3511', email: 'DORGTA@floridarevenue.com', website: 'https://floridarevenue.com/taxes/taxesfees/Pages/reemployment.aspx' },
  { state: 'GA', name: 'Georgia', agency: 'Department of Labor', division: 'Unemployment Insurance Division', address: '148 Andrew Young International Blvd., NE, Atlanta, GA 30303-1751', phones: ['404-232-3001'], fax: '855-436-7365', email: 'employer.hotline@gdol.ga.gov', website: 'https://dol.georgia.gov/employers' },
  { state: 'HI', name: 'Hawaii', agency: 'Department of Labor and Industrial Relations', division: 'Unemployment Insurance Division', address: '830 Punchbowl St., Honolulu, HI 96813', phones: ['808-762-5752', '833-901-2272'], fax: '808-586-9077', email: 'dlir.unemployment@hawaii.gov', website: 'http://labor.hawaii.gov/ui' },
  { state: 'ID', name: 'Idaho', agency: 'Department of Labor', division: 'Unemployment Insurance Division', address: '317 West Main St., Boise, ID 83735', phones: ['208-332-3576', '800-448-2977'], fax: '208-639-3256', email: 'michael.johnson@labor.idaho.gov', website: 'https://www.labor.idaho.gov/businesses/e-services/' },
  { state: 'IL', name: 'Illinois', agency: 'Department of Employment Security', address: '527 South Wells St., Chicago, IL 60607', phones: ['312-793-4880', '800-247-4984'], fax: '312-793-2424', website: 'https://ides.illinois.gov/employer-resources/taxes-reporting.html' },
  { state: 'IN', name: 'Indiana', agency: 'Department of Workforce Development', address: '10 North Senate Ave., Indianapolis, IN 46204', phones: ['800-891-6499'], fax: '317-233-5499', email: 'workone@dwd.in.gov', website: 'https://www.in.gov/dwd/indiana-unemployment' },
  { state: 'IA', name: 'Iowa', agency: 'Iowa Workforce Development', division: 'Unemployment Insurance Services Division — Tax Bureau', address: '1000 East Grand Ave., Des Moines, IA 50319-0209', phones: ['515-281-5339', '888-848-7442'], fax: '515-281-4273', email: 'iwduitax@iwd.iowa.gov', website: 'https://workforce.iowa.gov/employers/unemployment-insurance' },
  { state: 'KS', name: 'Kansas', agency: 'Department of Labor', division: 'Division of Employment Security', address: '401 SW Topeka Blvd., Topeka, KS 66603-3182', phones: ['785-296-5027'], fax: '785-296-5779', email: 'KDOL.UITax@ks.gov', website: 'https://www.dol.ks.gov/employers/employer-services' },
  { state: 'KY', name: 'Kentucky', agency: 'Career Center — Office of Employment and Training', address: '275 East Main St., Frankfort, KY 40621-0001', phones: ['502-564-2900'], fax: '502-564-5502', email: 'des.uit@ky.gov', website: 'https://kcc.ky.gov/employer/Pages/Unemployment-Insurance.aspx' },
  { state: 'LA', name: 'Louisiana', agency: 'Workforce Commission', address: 'P.O. Box 94186, Baton Rouge, LA 70804-9186', phones: ['866-783-5567', '225-342-2977'], fax: '225-346-6073', email: 'UITax@lwc.la.gov', website: 'https://www.laworks.net/UnemploymentInsurance/UI_Employers.asp' },
  { state: 'ME', name: 'Maine', agency: 'Department of Labor', division: 'Bureau of Unemployment Compensation', address: 'P.O. Box 259, Augusta, ME 04332-0259', phones: ['207-621-5120', '800-593-7660'], fax: '207-287-3733', email: 'division.uctax@maine.gov', website: 'https://www.maine.gov/unemployment/employers' },
  { state: 'MD', name: 'Maryland', agency: 'Department of Labor, Licensing and Regulation', division: 'Division of Unemployment Insurance', address: '1100 North Eutaw St., Baltimore, MD 21201', phones: ['410-949-0033'], fax: '410-462-7927', email: 'dluiemployerassistance-dllr@maryland.gov', website: 'https://labor.maryland.gov/unemployment-insurance/' },
  { state: 'MA', name: 'Massachusetts', agency: 'Department of Labor and Workforce Development', division: 'Division of Unemployment Assistance', address: 'Charles F. Hurley Bldg., 19 Staniford St., Boston, MA 02114', phones: ['617-626-5075'], fax: '617-626-6222', email: 'UIEmployerRates@mass.gov', website: 'https://www.mass.gov/unemployment-insurance-ui-for-employers' },
  { state: 'MI', name: 'Michigan', agency: 'Department of Talent and Economic Development', division: 'Unemployment Insurance Agency', address: '3024 West Grand Blvd., Suite 11-500, Detroit, MI 48202', phones: ['800-638-3994', '855-484-2636'], fax: '313-456-2302', email: 'OEO@michigan.gov', website: 'https://www.michigan.gov/leo/bureaus-agencies/uia' },
  { state: 'MN', name: 'Minnesota', agency: 'Department of Employment and Economic Development', division: 'Unemployment Insurance Program', address: '1st National Bank Building, Suite E200, 332 Minnesota St., St. Paul, MN 55101-1351', phones: ['651-296-6141'], fax: '651-297-5283', email: 'ui.mn@state.mn.us', website: 'https://www.uimn.org/employers/index.jsp' },
  { state: 'MS', name: 'Mississippi', agency: 'Department of Employment Security', address: 'P.O. Box 1699, Jackson, MS 39215-1699', phones: ['601-493-9427'], fax: '601-961-7784', email: 'tax@mdes.ms.gov', website: 'https://mdes.ms.gov/employers/unemployment-tax/' },
  { state: 'MO', name: 'Missouri', agency: 'Department of Labor', division: 'Division of Employment Security', address: 'P.O. Box 59, Jefferson City, MO 65104-0059', phones: ['573-751-1995', '573-751-3329'], fax: '573-751-4945', email: 'esemptax@labor.mo.gov', website: 'https://labor.mo.gov/DES/Employers' },
  { state: 'MT', name: 'Montana', agency: 'Department of Labor and Industry', division: 'Unemployment Insurance Division', address: 'P.O. Box 6339, Helena, MT 59604-6339', phones: ['406-444-3834'], fax: '406-444-0629', email: 'uieservices@mt.gov', website: 'http://uid.dli.mt.gov' },
  { state: 'NE', name: 'Nebraska', agency: 'Nebraska Workforce Development', division: 'Office of Unemployment Insurance', address: '550 South 16th St., P.O. Box 94600, Lincoln, NE 68509-4600', phones: ['402-471-9930', '402-471-9898'], fax: '402-471-9994', email: 'ndol.uiccontact@nebraska.gov', website: 'https://dol.nebraska.gov/UITax' },
  { state: 'NV', name: 'Nevada', agency: 'Department of Employment, Training and Rehabilitation', division: 'Unemployment Insurance Tax Services', address: '500 East 3rd St., Carson City, NV 89713-0030', phones: ['775-684-6322', '775-684-6328'], fax: '775-684-6367', website: 'https://nui.nv.gov/ESS/_/' },
  { state: 'NH', name: 'New Hampshire', agency: 'New Hampshire Employment Security', address: '32 South Main St., Concord, NH 03301', phones: ['603-228-4033', '603-228-4034'], fax: '603-229-4323', email: 'nhes_employer.assist@nhes.nh.gov', website: 'https://www.nhes.nh.gov/employers/employer-claims-taxes' },
  { state: 'NJ', name: 'New Jersey', agency: 'Department of Labor and Workforce Development', division: 'Division of Unemployment Insurance', address: 'P.O. Box 058, Trenton, NJ 08625-0058', phones: ['609-292-7162'], fax: '609-633-2884', email: 'emplacct@dol.nj.gov', website: 'https://nj.gov/labor/myunemployment/' },
  { state: 'NM', name: 'New Mexico', agency: 'Department of Workforce Solutions', division: 'Unemployment Insurance Tax Bureau', address: 'P.O. Box 1928, Albuquerque, NM 87103', phones: ['877-664-6984', '505-841-8576'], fax: '505-841-8480', email: 'uitax.support@state.nm.us', website: 'https://www.dws.state.nm.us/en-us/' },
  { state: 'NY', name: 'New York', agency: 'Department of Labor', division: 'Division of Unemployment Insurance', address: 'W. Averell Harriman State Office Campus, Building 12, Room 356, Albany, NY 12240-0322', phones: ['518-457-2635', '518-457-9000'], fax: '518-402-8215', website: 'https://dol.ny.gov/unemployment/unemployment-insurance-information-employers' },
  { state: 'NC', name: 'North Carolina', agency: 'Department of Commerce', division: 'Division of Employment Security', address: 'P.O. Box 25903, Raleigh, NC 27611-5903', phones: ['919-707-1150'], fax: '919-733-1256', email: 'des.tax.customerservice@nccommerce.com', website: 'https://www.des.nc.gov/responding-unemployment-claims' },
  { state: 'ND', name: 'North Dakota', agency: 'Job Service North Dakota', address: 'P.O. Box 5507, Bismarck, ND 58506-5507', phones: ['701-328-2814', '800-472-2952'], fax: '701-328-1882', website: 'https://www.jobsnd.com/unemployment-business-tax' },
  { state: 'OH', name: 'Ohio', agency: 'Department of Job and Family Services', division: 'Office of Unemployment Compensation', address: 'P.O. Box 182404, Columbus, OH 43218-2404', phones: ['614-466-2319', '877-644-6562'], fax: '614-466-7449', website: 'https://jfs.ohio.gov/job-services-and-unemployment/unemployment/for-employers' },
  { state: 'OK', name: 'Oklahoma', agency: 'Employment Security Commission', division: 'Unemployment Insurance Division', address: 'P.O. Box 52003, Oklahoma City, OK 73152-2003', phones: ['405-525-6799'], fax: '405-557-5355', email: 'OESCHelps@oesc.state.ok.us', website: 'https://oklahoma.gov/oesc/employers.html' },
  { state: 'OR', name: 'Oregon', agency: 'Oregon Employment Department', division: 'Unemployment Insurance Tax Section', address: '875 Union St., NE, Salem, OR 97311-0030', phones: ['503-947-1488'], fax: '503-947-1487', email: 'OED_Taxinfo_User@oregon.gov', website: 'https://www.oregon.gov/EMPLOY/Businesses/Pages/default.aspx' },
  { state: 'PA', name: 'Pennsylvania', agency: 'Department of Labor and Industry', division: 'Office of Unemployment Compensation Tax Services', address: '7th Floor, Labor and Industry Bldg., 651 Boas St., Harrisburg, PA 17121', phones: ['717-787-7679'], fax: '866-403-6163', email: 'UCEmployerHelp@pa.gov', website: 'https://www.pa.gov/agencies/dli/resources/for-employers-and-educators/how-to-file' },
  { state: 'PR', name: 'Puerto Rico', agency: 'Department of Labor and Human Resources', division: 'Bureau of Employment Security', address: 'Prudencio Rivera Martinez Bldg., 505 Munoz Rivera Ave., Hato Rey, PR 00918', phones: ['787-754-2119'], website: 'https://www.trabajo.pr.gov/' },
  { state: 'RI', name: 'Rhode Island', agency: 'Department of Labor and Training', division: 'Employer Tax Division', address: '1511 Pontiac Ave., Cranston, RI 02920-0942', phones: ['401-574-8700', '401-243-9137'], fax: '401-574-8940', email: 'unemploymentinsurance@dlt.ri.gov', website: 'https://dlt.ri.gov/employers/employer-tax-unit' },
  { state: 'SC', name: 'South Carolina', agency: 'Department of Employment and Workforce', address: '1550 Gadsden St., P.O. Box 995, Columbia, SC 29202', phones: ['803-737-2400'], fax: '803-737-2659', email: 'uitax@dew.sc.gov', website: 'https://www.dew.sc.gov/employers/unemployment-tax-information' },
  { state: 'SD', name: 'South Dakota', agency: 'Department of Labor & Regulation', division: 'Reemployment Assistance Tax Unit', address: 'P.O. Box 4730, Aberdeen, SD 57402-4730', phones: ['605-626-2312'], fax: '605-626-3347', website: 'https://dlr.sd.gov' },
  { state: 'TN', name: 'Tennessee', agency: 'Department of Labor and Workforce Development', division: 'Employment Security Division', address: '220 French Landing Dr., Nashville, TN 37243', phones: ['855-286-7417'], fax: '615-532-5110', email: 'Employment.security@tn.gov', website: 'https://tn.gov' },
  { state: 'TX', name: 'Texas', agency: 'Texas Workforce Commission', address: '101 East 15th St., Austin, TX 78778-0001', phones: ['866-630-3739', '866-274-1722'], fax: '512-463-9111', website: 'https://twc.texas.gov' },
  { state: 'UT', name: 'Utah', agency: 'Department of Workforce Services', division: 'Division of Unemployment Insurance', address: 'P.O. Box 45249, Salt Lake City, UT 84145-0249', phones: ['801-526-9235', '800-222-2857'], fax: '801-526-9236', email: 'dwscontactus@utah.gov', website: 'https://jobs.utah.gov' },
  { state: 'VT', name: 'Vermont', agency: 'Department of Labor', division: 'Unemployment Insurance and Wages', address: 'P.O. Box 488, 5 Green Mountain Dr., Montpelier, VT 05601-0488', phones: ['802-828-4344', '877-214-3331'], fax: '802-828-4022', email: 'Labor.UIAndWages@vermont.gov', website: 'https://labor.vermont.gov/unemployment-insurance/ui-employers' },
  { state: 'VA', name: 'Virginia', agency: 'Virginia Employment Commission', address: 'P.O. Box 1358, Richmond, VA 23218-1358', phones: ['866-354-5579'], fax: '804-786-5890', email: 'employer.accounts@vec.virginia.gov', website: 'https://www.vec.virginia.gov/employers' },
  { state: 'WA', name: 'Washington', agency: 'Employment Security Department', division: 'Unemployment Insurance Division', address: 'P.O. Box 9046, Olympia, WA 98507-9046', phones: ['360-902-9360', '360-902-9670'], fax: '360-902-9202', email: 'status@esd.wa.gov', website: 'https://esd.wa.gov/employer-requirements/unemployment-taxes' },
  { state: 'WV', name: 'West Virginia', agency: 'Department of Commerce', division: 'Workforce West Virginia', address: '112 California Ave., Charleston, WV 25305-0112', phones: ['304-558-2674'], fax: '304-558-5037', email: 'uctaxunit@wv.gov', website: 'https://workforcewv.org/businesses/unemployment-tax-information/' },
  { state: 'WI', name: 'Wisconsin', agency: 'Department of Workforce Development', division: 'Division of Unemployment Insurance', address: 'P.O. Box 7905, Madison, WI 53707-7905', phones: ['608-261-6700', '800-494-4944'], fax: '608-267-1400', email: 'taxnet@dwd.wisconsin.gov', website: 'https://dwd.wisconsin.gov/uitax/' },
  { state: 'WY', name: 'Wyoming', agency: 'Department of Workforce Services', division: 'Unemployment Insurance Division', address: 'P.O. Box 2760, Casper, WY 82602-2760', phones: ['307-235-3217', '307-235-3264'], fax: '307-235-3278', email: 'dws-csp-uitaxhelp@wyo.gov', website: 'https://dws.wyo.gov/dws-division/unemployment-insurance/' },
];

export function SuiAgencyDirectory() {
  const [selectedState, setSelectedState] = useState<string>('');

  const selected = AGENCIES.find(a => a.state === selectedState);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            State Unemployment Insurance Agency Directory
          </CardTitle>
          <CardDescription>
            Select a state to view the agency contact information for registering your SUI account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select a state..." />
            </SelectTrigger>
            <SelectContent>
              {AGENCIES.map(a => (
                <SelectItem key={a.state} value={a.state}>
                  {a.state} — {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  <Badge variant="outline" className="mr-2 text-base">{selected.state}</Badge>
                  {selected.name}
                </CardTitle>
                <CardDescription className="mt-1">{selected.agency}</CardDescription>
                {selected.division && (
                  <p className="text-sm text-muted-foreground mt-0.5">{selected.division}</p>
                )}
              </div>
              <a
                href={selected.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Visit Website <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                    <p className="text-sm">{selected.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                    {selected.phones.map((p, i) => (
                      <a key={i} href={`tel:${p.replace(/\D/g, '')}`} className="block text-sm text-primary hover:underline">
                        {p}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {selected.fax && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fax</p>
                      <p className="text-sm">{selected.fax}</p>
                    </div>
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                      {selected.email.startsWith('http') ? (
                        <a href={selected.email} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          Contact Form
                        </a>
                      ) : (
                        <a href={`mailto:${selected.email}`} className="text-sm text-primary hover:underline">
                          {selected.email}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedState && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select a state above to view its SUI agency contact information.</p>
            <p className="text-xs mt-1">Use this directory when registering for a new state unemployment account.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
