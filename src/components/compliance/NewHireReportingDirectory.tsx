import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Phone, Mail, MapPin, UserPlus } from 'lucide-react';

interface AgencyInfo {
  state: string;
  name: string;
  agency: string;
  address: string;
  phones: string[];
  fax?: string;
  email?: string;
  website: string;
}

const AGENCIES: AgencyInfo[] = [
  { state: 'AL', name: 'Alabama', agency: 'Department of Labor New-Hire Unit', address: '649 Monroe St., Room 3205, Montgomery, AL 36131-0378', phones: ['334-206-6020'], fax: '334-206-6020', email: 'newhire@labor.alabama.gov', website: 'https://adol.alabama.gov/employers/alabama-new-hire/' },
  { state: 'AK', name: 'Alaska', agency: 'Department of Revenue — Child Support Services Division — New Hire Reporting Section', address: '550 West 7th Ave., Suite 310, Anchorage, AK 99501-6699', phones: ['907-269-6089', '877-269-6685'], fax: '907-787-3197', email: 'dor.cssd.customerservice.anchorage@alaska.gov', website: 'https://acsess.childsupport.alaska.gov/businessportal/_/' },
  { state: 'AZ', name: 'Arizona', agency: 'Arizona New Hire Reporting Center', address: 'P.O. Box 138003, Sacramento, CA 95813', phones: ['888-282-2064'], fax: '888-282-0502', email: 'az-newhire@maximus.com', website: 'https://newhire-reporting.com/AZ-Newhire/Default.aspx' },
  { state: 'AR', name: 'Arkansas', agency: 'Arkansas New Hire Reporting Center', address: 'P.O. Box 2540, Little Rock, AR 72203', phones: ['501-376-2125', '800-259-2095'], fax: '501-376-2682', website: 'https://www.workforce.arkansas.gov/Tax21/Home.aspx' },
  { state: 'CA', name: 'California', agency: 'Employment Development Department', address: 'P.O. Box 997016, MIC 96, Sacramento, CA 95899-7016', phones: ['916-657-0529', '888-745-3886'], fax: '916-319-4400', website: 'https://edd.ca.gov/en/Payroll_Taxes/New_Hire_Reporting' },
  { state: 'CO', name: 'Colorado', agency: 'Colorado New Hires Operation Center', address: 'P.O. Box 13089, Sacramento, CA 95813-3089', phones: ['303-297-2849', '800-696-1468'], fax: '303-297-2595', email: 'cdhs_FSREmployerServices@state.co.us', website: 'https://www.newhire.state.co.us' },
  { state: 'CT', name: 'Connecticut', agency: 'Department of Labor — Office of Research', address: '200 Folly Brook Blvd., Wethersfield, CT 06109', phones: ['860-263-6310'], fax: '800-816-1108', email: 'dol.ctnewhires@ct.gov', website: 'https://www1.ctdol.state.ct.us/newhires/index2.asp' },
  { state: 'DE', name: 'Delaware', agency: 'Delaware State Directory of New Hires', address: 'P.O. Box 90370, Atlanta, GA 30364', phones: ['855-481-0018'], fax: '855-481-0047', website: 'https://www.de-newhire.com/de-Newhire/default.aspx' },
  { state: 'DC', name: 'District of Columbia', agency: 'District of Columbia Directory of New Hires', address: 'P.O. Box 457, Norwell, MA 02061', phones: ['877-846-9523'], fax: '877-892-6388', website: 'https://www.dc-newhire.com' },
  { state: 'FL', name: 'Florida', agency: 'Florida New Hire Reporting Center', address: 'P.O. Box 6500, Tallahassee, FL 32314-6500', phones: ['850-656-3343', '888-854-4791'], fax: '850-656-0528', email: 'newhiresupport@floridarevenue.com', website: 'https://servicesforemployers.floridarevenue.com/Pages/home.aspx' },
  { state: 'GA', name: 'Georgia', agency: 'Georgia New Hire Reporting Center', address: 'P.O. Box 3068, Trenton, NJ 08619', phones: ['404-525-2985', '888-541-0469'], fax: '404-525-2983', email: 'contact@ga-newhire.com', website: 'https://www.ga-newhire.com' },
  { state: 'GU', name: 'Guam', agency: 'Office of the Attorney General — Child Support Enforcement Division', address: '590 S. Marine Corps Dr., Suite 901, ITC Building, Tamuning, Guam 96913', phones: ['671-475-3324'], fax: '671-472-7596', email: 'employerservices@guamcse.net', website: 'https://guamattorneygeneral.org/csed/' },
  { state: 'HI', name: 'Hawaii', agency: 'Child Support Enforcement Agency — New Hire Reporting', address: 'Kakuhihewa Bldg., 601 Kamokila Blvd., Suite 251, Kapolei, HI 96707-2021', phones: ['808-692-7029', '888-317-9081'], fax: '808-692-7001', website: 'http://ag.hawaii.gov/csea/employer-information' },
  { state: 'ID', name: 'Idaho', agency: 'Department of Labor — New Hire Reporting', address: '317 West Main St., Boise, ID 83735-0610', phones: ['208-332-8941', '800-627-3880'], fax: '208-332-7411', email: 'newhire@labor.idaho.gov', website: 'https://www.labor.idaho.gov/dnn/Businesses/Report-New-Hires' },
  { state: 'IL', name: 'Illinois', agency: 'Department of Employment Security — New Hire Directory', address: 'P.O. Box 19473, Springfield, IL 62794', phones: ['312-793-6298', '800-327-4473'], fax: '217-557-1947', email: 'DES.nhire@illinois.gov', website: 'https://newhire.hfs.illinois.gov/NewHireWeb/NewHireReporting.jsp' },
  { state: 'IN', name: 'Indiana', agency: 'Indiana New Hire Reporting Center', address: 'P.O. Box 3429, Trenton, NJ 08619', phones: ['317-612-3028', '866-879-0198'], fax: '317-612-3036', email: 'Contact@IN-NewHire.com', website: 'https://www.in-newhire.com' },
  { state: 'IA', name: 'Iowa', agency: 'Department of Human Services — Child Support — Iowa Centralized Employee Registry', address: 'P.O. Box 10322, Des Moines, IA 50306-0322', phones: ['877-274-2580', '800-759-5881'], fax: '515-281-3749', email: 'csrue@dhs.state.ia.us', website: 'https://secureapp.dhs.state.ia.us/epay/' },
  { state: 'KS', name: 'Kansas', agency: 'Kansas Department of Labor — New Hire Directory', address: 'P.O. Box 3510, Topeka, KS 66601-3510', phones: ['785-296-5000', '888-219-7801'], fax: '785-291-3424', email: 'KDOL.NewHires@ks.gov', website: 'https://www.dol.ks.gov/employers/employer-services/new-hire-reporting' },
  { state: 'KY', name: 'Kentucky', agency: 'Kentucky New Hire Reporting Center', address: 'P.O. Box 137002, Sacramento, CA 95813-7002', phones: ['800-817-2262'], fax: '800-817-0099', email: 'ky-newhire@maximus.com', website: 'https://www.ky-newhire.com' },
  { state: 'LA', name: 'Louisiana', agency: 'Department of Children and Family Services — Directory of New Hires', address: 'P.O. Box 138078, Sacramento, CA 95813', phones: ['888-223-1461'], fax: '888-223-1462', website: 'https://newhire-reporting.com/LA-newhire/' },
  { state: 'ME', name: 'Maine', agency: 'Department of Health and Human Services — New Hire Reporting Program', address: '11 State House Station, 109 Capitol Street, Augusta, ME 04333-0011', phones: ['207-624-4100', '888-641-0037'], fax: '207-287-6882', email: 'contact@ME-Newhire.com', website: 'https://www.maine.gov/dhhs/ofi/programs-services/child-support-services/employers' },
  { state: 'MD', name: 'Maryland', agency: 'Maryland State Directory of New Hires', address: 'P.O. Box 1316, Baltimore, MD 21203-1316', phones: ['410-281-6000', '888-634-4737'], fax: '410-281-6004', website: 'https://mdnewhire.com' },
  { state: 'MA', name: 'Massachusetts', agency: 'Department of Revenue — New Hire Reporting System', address: 'P.O. Box 55141, Boston, MA 02205-5141', phones: ['617-887-7562', '800-332-2733'], fax: '617-376-3262', email: 'cox@dor.state.ma.us', website: 'https://www.mass.gov/info-details/learn-about-the-new-hire-reporting-program' },
  { state: 'MI', name: 'Michigan', agency: 'Michigan New Hire Operations Center', address: 'P.O. Box 85010, Lansing, MI 48908-5010', phones: ['800-524-9846', '517-318-1659'], fax: '877-318-1659', website: 'https://mi-newhire.com' },
  { state: 'MN', name: 'Minnesota', agency: 'Minnesota New Hire Reporting Center', address: 'P.O. Box 64212, St. Paul, MN 55164-0212', phones: ['651-227-4661', '800-672-4473'], fax: '651-227-4991', website: 'https://mn-newhire.com/' },
  { state: 'MS', name: 'Mississippi', agency: 'Mississippi State Directory of New Hires', address: 'P.O. Box 437, Norwell, MA 02061', phones: ['800-241-1330'], fax: '800-937-8668', website: 'https://ms-newhire.com' },
  { state: 'MO', name: 'Missouri', agency: 'Department of Social Services — Family Support Division — Child Support Enforcement', address: 'P.O. Box 3340, Jefferson City, MO 65105-3340', phones: ['573-526-8699', '800-585-9234'], fax: '888-663-6751', website: 'https://www.missouriemployer.dss.mo.gov/NewHireInfo.aspx' },
  { state: 'MT', name: 'Montana', agency: 'Department of Public Health and Human Services — New Hire Reporting Program', address: 'P.O. Box 8013, Helena, MT 59604-8013', phones: ['406-444-9290', '888-866-0327'], fax: '406-444-0745', email: 'NewHireReporting@mt.gov', website: 'https://dphhs.mt.gov/cssd/employerinfo/newhirereporting' },
  { state: 'NE', name: 'Nebraska', agency: 'Nebraska Department of Health and Human Services', address: 'P.O. Box 483, Norwell, MA 02061', phones: ['888-256-0293'], fax: '866-808-2007', website: 'https://ne-newhire.com/' },
  { state: 'NV', name: 'Nevada', agency: 'Department of Employment, Training and Rehabilitation — New Hire Unit', address: '500 East Third St., Carson City, NV 89713-0033', phones: ['775-684-6370', '888-639-7241'], fax: '775-684-6379', email: 'newhire@detr.nv.gov', website: 'https://detr.nv.gov/Page/New_Hire_Reporting_Info' },
  { state: 'NH', name: 'New Hampshire', agency: 'NH Department of Employment Security — New Hire Program', address: 'P.O. Box 2092, Concord, NH 03302-2092', phones: ['603-229-4371', '800-803-4485'], fax: '603-224-0825', website: 'https://www.nhes.nh.gov/employers/business-compliance' },
  { state: 'NJ', name: 'New Jersey', agency: 'New Jersey New Hire Directory', address: 'P.O. Box 4654, Trenton, NJ 08650-4654', phones: ['609-631-0330', '877-654-4737'], fax: '800-304-4901', website: 'https://www.njcsesp.com/' },
  { state: 'NM', name: 'New Mexico', agency: 'New Mexico New Hires Directory', address: 'P.O. Box 2999, Mercerville, NJ 08690', phones: ['888-878-1607'], fax: '888-878-1614', website: 'https://nm-newhire.com' },
  { state: 'NY', name: 'New York', agency: 'Department of Taxation and Finance — New Hire Processing Unit', address: 'P.O. Box 15119, Albany, NY 12212-5119', phones: ['518-320-1079', '800-972-1233'], fax: '518-320-1080', website: 'https://www.tax.ny.gov/bus/wt/newhire.htm' },
  { state: 'NC', name: 'North Carolina', agency: 'North Carolina State Directory of New Hires', address: 'P.O. Box 427, Norwell, MA 02061', phones: ['888-514-4568'], fax: '919-877-1019', email: 'contact@ncnewhires.ncdhhs.gov', website: 'https://ncnewhires.ncdhhs.gov/' },
  { state: 'ND', name: 'North Dakota', agency: 'Department of Human Services — Child Support Enforcement Division', address: 'P.O. Box 7190, Bismarck, ND 58507-7190', phones: ['701-328-6524', '800-755-8530'], fax: '701-328-5497', email: 'csemployer@nd.gov', website: 'https://childsupport.dhs.nd.gov/employers/new-hire-reporting' },
  { state: 'OH', name: 'Ohio', agency: 'Ohio New Hire Reporting Center', address: 'P.O. Box 15309, Columbus, OH 43215-0309', phones: ['614-221-5330', '888-872-1490'], fax: '614-221-7088', website: 'https://oh-newhire.com' },
  { state: 'OK', name: 'Oklahoma', agency: 'Oklahoma New Hire Reporting Center', address: 'P.O. Box 52003, Oklahoma City, OK 73152-2003', phones: ['405-325-9190', '866-553-2368'], fax: '405-557-5350', email: 'ocss.contact.esc@okdhs.org', website: 'https://www.ok.gov/oesc/newhire/app/index.php' },
  { state: 'OR', name: 'Oregon', agency: 'Department of Justice — Division of Child Support — Employer New Hire Reporting Program', address: '4600 25th Ave. NE, Suite 180, Salem, OR 97301', phones: ['503-378-2868', '866-907-2857'], fax: '503-378-2863', email: 'emplnewhire.help@doj.oregon.gov', website: 'https://www.doj.state.or.us/child-support/for-employers/report-new-hires/' },
  { state: 'PA', name: 'Pennsylvania', agency: 'Commonwealth of Pennsylvania — New Hire Reporting Program', address: 'P.O. Box 69400, Harrisburg, PA 17106-9400', phones: ['888-724-4737'], fax: '717-657-4473', email: 'RA-LI-CWDS-NewHire@pa.gov', website: 'https://www.pacareerlink.pa.gov/jponline//Common/LandingPage/ReportNewHires' },
  { state: 'PR', name: 'Puerto Rico', agency: 'State New Hire Registry', address: 'P.O. Box 190797, San Juan, PR 00919-1020', phones: ['787-754-5818'], fax: '787-765-1313', email: 'PATRONOSNH@trabajo.pr.gov', website: 'https://patronos.trabajo.pr.gov' },
  { state: 'RI', name: 'Rhode Island', agency: 'Rhode Island New Hire Reporting Directory', address: 'P.O. Box 485, Norwell, MA 02061', phones: ['888-870-6461'], fax: '888-430-6907', website: 'https://ri-newhire.com' },
  { state: 'SC', name: 'South Carolina', agency: 'Department of Social Services — Employer New Hire Reporting Program', address: 'P.O. Box 1469, Columbia, SC 29202-1469', phones: ['803-898-9235', '888-454-5294'], fax: '803-898-9100', email: 'scnewhire@dss.sc.gov', website: 'https://newhire.sc.gov' },
  { state: 'SD', name: 'South Dakota', agency: 'Department of Labor and Regulation — New Hire Reporting Center', address: 'P.O. Box 4700, Aberdeen, SD 57402-4700', phones: ['605-626-2942', '888-827-6078'], fax: '605-626-2842', website: 'https://dlr.sd.gov' },
  { state: 'TN', name: 'Tennessee', agency: 'Tennessee New Hire Reporting Program', address: 'P.O. Box 438, Norwell, MA 02061', phones: ['615-884-2828', '888-715-2280'], fax: '877-505-4761', email: 'contact@tnnewhire.com', website: 'https://tnnewhire.com' },
  { state: 'TX', name: 'Texas', agency: 'Texas Employer New Hire Reporting Operations Center', address: 'P.O. Box 149224, Austin, TX 78714-9224', phones: ['800-850-6442'], fax: '800-732-5015', email: 'employer.newhire@texasattorneygeneral.gov', website: 'https://employer.oag.texas.gov' },
  { state: 'UT', name: 'Utah', agency: 'Utah Department of Workforce Services — New Hire Registry', address: '140 East 300 S, P.O. Box 45247, Salt Lake City, UT 84145-0247', phones: ['801-526-9235', '800-222-2857'], fax: '801-526-4391', website: 'https://jobs.utah.gov' },
  { state: 'VT', name: 'Vermont', agency: 'Department of Labor — New Hire Reporting', address: '5 Green Mountain Dr., P.O. Box 488, Montpelier, VT 05601-0488', phones: ['802-241-2194', '800-786-3214'], fax: '802-828-4286', email: 'Labor.UIandWages@vermont.gov', website: 'https://labor.vermont.gov/unemployment-insurance/unemployment-information-employers/employer-online-services/new-hire' },
  { state: 'VI', name: 'Virgin Islands', agency: 'Virgin Islands Department of Labor — New Hire Reporting', address: 'P.O. Box 303159, St. Thomas, VI 00803-3359', phones: ['340-776-3700'], fax: '340-774-5908', email: 'newhire@vidol.gov', website: 'https://www.vidol.gov/unemployment-insurance/' },
  { state: 'VA', name: 'Virginia', agency: 'Virginia New Hire Reporting Center', address: 'P.O. Box 3449, Trenton, NJ 08619', phones: ['800-979-9014'], fax: '800-688-2680', website: 'https://va-newhire.com' },
  { state: 'WA', name: 'Washington', agency: 'Department of Social and Health Services — Division of Child Support — New Hire Reporting Program', address: 'P.O. Box 9023, Olympia, WA 98507-9023', phones: ['800-562-0479'], fax: '800-782-0624', email: 'dcshire@dshs.wa.gov', website: 'https://www.dshs.wa.gov/esa/division-child-support/new-hire-reporting' },
  { state: 'WV', name: 'West Virginia', agency: 'West Virginia New Hire Reporting Center', address: 'P.O. Box 2998, Trenton, NJ 08690', phones: ['877-625-4669'], fax: '877-625-4675', website: 'https://www.wv-newhire.com' },
  { state: 'WI', name: 'Wisconsin', agency: 'Wisconsin New Hire Reporting Center', address: 'P.O. Box 14431, Madison, WI 53708-0431', phones: ['888-300-4473'], fax: '800-277-8075', website: 'https://dwd.wisconsin.gov/uinh' },
  { state: 'WY', name: 'Wyoming', agency: 'Wyoming New Hire Reporting Center', address: 'P.O. Box 138100, Sacramento, CA 95813-8100', phones: ['800-970-9258'], fax: '800-921-9651', website: 'https://newhire-reporting.com/WY-Newhire/default.aspx' },
];

export function NewHireReportingDirectory() {
  const [selectedState, setSelectedState] = useState<string>('');
  const selected = AGENCIES.find(a => a.state === selectedState);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            State New Hire Reporting Agency Directory
          </CardTitle>
          <CardDescription>
            Select a state to view the new hire reporting agency contact information for employer compliance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select a state..." />
            </SelectTrigger>
            <SelectContent>
              {AGENCIES.map(a => (
                <SelectItem key={a.state} value={a.state}>{a.state} — {a.name}</SelectItem>
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
              </div>
              <a href={selected.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
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
                      <a key={i} href={`tel:${p.replace(/\D/g, '')}`} className="block text-sm text-primary hover:underline">{p}</a>
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
                        <a href={selected.email} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Contact Form</a>
                      ) : (
                        <a href={`mailto:${selected.email}`} className="text-sm text-primary hover:underline">{selected.email}</a>
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
            <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select a state above to view its new hire reporting agency contact information.</p>
            <p className="text-xs mt-1">Employers are required to report new hires to the state within 20 days of hire.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
